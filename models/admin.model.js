// models/admin.model.js
import knex from "../utils/db.js";

export default {
  /* ---------- DASHBOARD STATS ---------- */
  async getDashboardStats() {
    try {
      // Sửa lại cú pháp count
      const total_students = await knex("users")
        .where({ role: "student" })
        .count("id as count")
        .first();

      const total_instructors = await knex("users")
        .where({ role: "instructor" })
        .count("id as count")
        .first();

      const total_courses = await knex("courses").count("id as count").first();

      const total_users = await knex("users").count("id as count").first();

      // Tính doanh thu từ các khóa học đã bán (giả sử)
      const revenueResult = await knex("courses")
        .sum("price as total_revenue")
        .first();

      return {
        total_students: parseInt(total_students.count, 10),
        total_instructors: parseInt(total_instructors.count, 10),
        total_courses: parseInt(total_courses.count, 10),
        total_users: parseInt(total_users.count, 10),
        total_revenue: parseFloat(revenueResult.total_revenue) || 0,
      };
    } catch (error) {
      console.error("Dashboard stats error:", error);
      return {
        total_students: 0,
        total_instructors: 0,
        total_courses: 0,
        total_users: 0,
        total_revenue: 0,
      };
    }
  },

  async getRecentCourses(limit = 5) {
    try {
      return await knex("courses")
        .select("courses.*", "users.full_name as instructor_name")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .orderBy("courses.id", "desc")
        .limit(limit);
    } catch (error) {
      console.error("Recent courses error:", error);
      return [];
    }
  },

  /* ---------- CATEGORY ---------- */
  async listCategories({ page = 1, limit = 50, search = "" } = {}) {
    try {
      const offset = (page - 1) * limit;
      const q = knex("categories")
        .select("id", "name", "parent_id")
        .orderBy("id", "asc")
        .limit(limit)
        .offset(offset);

      if (search) q.whereILike("name", `%${search}%`);

      const rows = await q;

      // Sửa lại cú pháp count
      const countResult = await knex("categories").count("id as count").first();

      return {
        rows,
        total: parseInt(countResult.count, 10),
      };
    } catch (error) {
      console.error("List categories error:", error);
      return { rows: [], total: 0 };
    }
  },

  async getCategoryById(id) {
    try {
      return await knex("categories").where({ id }).first();
    } catch (error) {
      console.error("Get category error:", error);
      return null;
    }
  },

  async createCategory({ name, parent_id = null }) {
    try {
      // Cách an toàn: Không dùng returning, chỉ insert và query lại
      const result = await knex("categories").insert({
        name,
        parent_id: parent_id || null,
      });

      console.log("Insert result:", result);

      // Lấy category mới nhất (vừa được tạo)
      const newCategory = await knex("categories")
        .where({ name })
        .orderBy("id", "desc")
        .first();

      console.log("New category created:", newCategory);
      return newCategory;
    } catch (error) {
      console.error("Create category error:", error);

      // Xử lý các loại lỗi
      if (error.code === "23505") {
        if (error.constraint === "categories_pkey") {
          // Lỗi sequence - cần reset
          const err = new Error("Lỗi hệ thống. Vui lòng thử lại.");
          err.code = "SEQUENCE_ERROR";
          throw err;
        } else if (error.constraint === "categories_name_unique") {
          // Lỗi trùng tên
          const err = new Error("Tên lĩnh vực đã tồn tại");
          err.code = "CATEGORY_NAME_EXISTS";
          throw err;
        }
      }

      throw error;
    }
  },

  async updateCategory(id, data) {
    try {
      await knex("categories")
        .where({ id })
        .update({ ...data });
      return this.getCategoryById(id);
    } catch (error) {
      console.error("Update category error:", error);
      throw error;
    }
  },

  // Delete category only if no course refers to it
  async deleteCategory(id) {
    try {
      const count = await knex("courses")
        .where({ category_id: id })
        .count("id as cnt")
        .first();

      if (parseInt(count.cnt, 10) > 0) {
        const err = new Error("Không thể xóa: lĩnh vực này đã có khoá học.");
        err.code = "CATEGORY_HAS_COURSES";
        throw err;
      }

      return await knex("categories").where({ id }).del();
    } catch (error) {
      console.error("Delete category error:", error);
      throw error;
    }
  },

  /* ---------- COURSE ---------- */
  async listCourses({ page = 1, limit = 50, search = "", status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const q = knex("courses")
        .select(
          "courses.*",
          "users.full_name as instructor_name",
          "categories.name as category_name"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin("categories", "courses.category_id", "categories.id")
        .orderBy("courses.id", "asc")
        .limit(limit)
        .offset(offset);

      if (search) q.whereILike("courses.title", `%${search}%`);
      if (status) q.where("courses.status", status);

      const rows = await q;

      const countResult = await knex("courses").count("id as count").first();

      return {
        rows,
        total: parseInt(countResult.count, 10),
      };
    } catch (error) {
      console.error("List courses error:", error);
      return { rows: [], total: 0 };
    }
  },

  async getCourseById(id) {
    try {
      return await knex("courses")
        .select(
          "courses.*",
          "users.full_name as instructor_name",
          "categories.name as category_name"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin("categories", "courses.category_id", "categories.id")
        .where("courses.id", id)
        .first();
    } catch (error) {
      console.error("Get course error:", error);
      return null;
    }
  },

  // Remove course (hard delete)
  async removeCourse(id) {
    try {
      return await knex.transaction(async (trx) => {
        const course = await trx("courses").where({ id }).first();
        if (!course) {
          const err = new Error("Course not found");
          err.code = "COURSE_NOT_FOUND";
          throw err;
        }

        // Delete lectures & chapters explicitly
        const chapterIds = await trx("chapters")
          .where({ course_id: id })
          .pluck("id");

        if (chapterIds.length) {
          await trx("lectures").whereIn("chapter_id", chapterIds).del();
          await trx("chapters").whereIn("id", chapterIds).del();
        }

        // delete enrollments, reviews, watchlists
        await trx("enrollments").where({ course_id: id }).del();
        await trx("reviews").where({ course_id: id }).del();
        await trx("watchlists").where({ course_id: id }).del();

        // finally delete course
        await trx("courses").where({ id }).del();
        return true;
      });
    } catch (error) {
      console.error("Remove course error:", error);
      throw error;
    }
  },

  /* ---------- USERS ---------- */
  async listUsers({ page = 1, limit = 50, role = null, search = "" } = {}) {
    try {
      const offset = (page - 1) * limit;
      const q = knex("users")
        .select(
          "id",
          "full_name",
          "email",
          "role",
          "created_at",
          "profile_picture_url"
        )
        .orderBy("created_at", "desc")
        .limit(limit)
        .offset(offset);

      if (role) q.where({ role });
      if (search) {
        q.whereILike("full_name", `%${search}%`).orWhereILike(
          "email",
          `%${search}%`
        );
      }

      const rows = await q;

      const countResult = await knex("users").count("id as count").first();

      return {
        rows,
        total: parseInt(countResult.count, 10),
      };
    } catch (error) {
      console.error("List users error:", error);
      return { rows: [], total: 0 };
    }
  },

  async getUserById(id) {
    try {
      return await knex("users")
        .select(
          "id",
          "full_name",
          "email",
          "role",
          "profile_picture_url",
          "instructor_bio",
          "created_at"
        )
        .where({ id })
        .first();
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  },

  async updateUserRole(id, role) {
    try {
      if (!["student", "instructor", "admin"].includes(role)) {
        const err = new Error("Invalid role");
        err.code = "INVALID_ROLE";
        throw err;
      }

      await knex("users").where({ id }).update({ role });
      return this.getUserById(id);
    } catch (error) {
      console.error("Update user role error:", error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      return await knex("users").where({ id }).del();
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  },

  // Create instructor account from admin
  async createInstructor({
    full_name,
    email,
    password_hash,
    instructor_bio = null,
  }) {
    try {
      const [user] = await knex("users")
        .insert({
          full_name,
          email,
          password_hash,
          role: "instructor",
          instructor_bio,
          created_at: new Date(),
        })
        .returning(["id", "full_name", "email", "role", "created_at"]);

      return user;
    } catch (error) {
      console.error("Create instructor error:", error);
      throw error;
    }
  },
  async getUserByEmail(email) {
    try {
      return await knex("users").where({ email }).first();
    } catch (error) {
      console.error("Get user by email error:", error);
      return null;
    }
  },
};
