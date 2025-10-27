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
  async findAllCategories() {
    try {
      return await knex("categories")
        .select("id", "name", "parent_id")
        .orderBy("id", "asc");
    } catch (error) {
      console.error("Find all categories error:", error);
      return [];
    }
  },

  async findCategoryById(id) {
    try {
      return await knex("categories").where({ id }).first();
    } catch (error) {
      console.error("Find category by id error:", error);
      return null;
    }
  },

  async addCategory(categoryData) {
    try {
      const result = await knex("categories").insert({
        name: categoryData.name,
        parent_id: categoryData.parent_id || null,
      });

      console.log("Insert result:", result);

      // Lấy category mới nhất (vừa được tạo)
      const newCategory = await knex("categories")
        .where({ name: categoryData.name })
        .orderBy("id", "desc")
        .first();

      console.log("New category created:", newCategory);
      return newCategory;
    } catch (error) {
      console.error("Add category error:", error);

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

  async patchCategory(id, categoryData) {
    try {
      await knex("categories")
        .where({ id })
        .update({ ...categoryData });
      return this.findCategoryById(id);
    } catch (error) {
      console.error("Patch category error:", error);
      throw error;
    }
  },

  async delCategory(id) {
    try {
      // Chuyển đổi id sang number để đảm bảo so sánh đúng
      const categoryId = parseInt(id, 10);

      // Kiểm tra xem category có tồn tại không
      const category = await knex("categories")
        .where({ id: categoryId })
        .first();
      if (!category) {
        const err = new Error("Không tìm thấy lĩnh vực để xóa");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
      }

      // Kiểm tra xem có khóa học nào thuộc category này không
      const courseCount = await knex("courses")
        .where({ category_id: categoryId })
        .count("id as cnt")
        .first();

      // Sửa lỗi: truy cập đúng property từ kết quả count
      const courseCountValue = parseInt(
        courseCount.cnt || courseCount.count || 0,
        10
      );

      if (courseCountValue > 0) {
        const err = new Error("Không thể xóa: lĩnh vực này đã có khoá học.");
        err.code = "CATEGORY_HAS_COURSES";
        throw err;
      }

      // Kiểm tra xem có lĩnh vực con nào không
      const childrenCount = await knex("categories")
        .where({ parent_id: categoryId })
        .count("id as cnt")
        .first();

      // Sửa lỗi: truy cập đúng property từ kết quả count
      const childrenCountValue = parseInt(
        childrenCount.cnt || childrenCount.count || 0,
        10
      );

      if (childrenCountValue > 0) {
        const err = new Error(
          "Không thể xóa: lĩnh vực này có lĩnh vực con. Vui lòng xóa hoặc di chuyển các lĩnh vực con trước."
        );
        err.code = "CATEGORY_HAS_CHILDREN";
        throw err;
      }

      // Thực hiện xóa
      const result = await knex("categories").where({ id: categoryId }).del();

      return result;
    } catch (error) {
      console.error("Delete category error:", error);

      // Nếu lỗi đã có code thì giữ nguyên, không thì thêm code mặc định
      if (!error.code) {
        error.code = "DELETE_CATEGORY_ERROR";
      }

      throw error;
    }
  },

  async findCategoryWithDetails(id) {
    try {
      const category = await knex("categories").where({ id }).first();
      if (!category) return null;

      // Lấy số lượng khóa học
      const courseCount = await knex("courses")
        .where({ category_id: id })
        .count("id as cnt")
        .first();

      // Lấy số lượng lĩnh vực con
      const childrenCount = await knex("categories")
        .where({ parent_id: id })
        .count("id as cnt")
        .first();

      // Lấy danh sách lĩnh vực con
      const children = await knex("categories")
        .select("id", "name")
        .where({ parent_id: id })
        .orderBy("name", "asc");

      return {
        ...category,
        course_count: parseInt(courseCount?.cnt || 0),
        children_count: parseInt(childrenCount?.cnt || 0),
        children,
      };
    } catch (error) {
      console.error("Find category with details error:", error);
      return null;
    }
  },

  async findCategoriesHierarchy() {
    try {
      const allCategories = await knex("categories")
        .select("id", "name", "parent_id")
        .orderBy("name", "asc");

      // Phân loại thành categories cha và con
      const parentCategories = allCategories.filter((cat) => !cat.parent_id);
      const childCategories = allCategories.filter((cat) => cat.parent_id);

      return {
        parentCategories,
        childCategories,
        allCategories,
      };
    } catch (error) {
      console.error("Find categories hierarchy error:", error);
      return { parentCategories: [], childCategories: [], allCategories: [] };
    }
  },

  /* ---------- COURSE ---------- */
  async findAllCourses() {
    try {
      return await knex("courses")
        .select(
          "courses.*",
          "users.full_name as instructor_name",
          "categories.name as category_name"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin("categories", "courses.category_id", "categories.id")
        .orderBy("courses.id", "asc");
    } catch (error) {
      console.error("Find all courses error:", error);
      return [];
    }
  },

  async findCourseById(id) {
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
      console.error("Find course by id error:", error);
      return null;
    }
  },

  async findCourseDetails(id) {
    try {
      const course = await this.findCourseById(id);
      if (!course) return null;

      // Lấy danh sách chapters
      const chapters = await knex("chapters")
        .where({ course_id: id })
        .orderBy("chapter_order", "asc");

      // Lấy danh sách lectures cho mỗi chapter
      for (let chapter of chapters) {
        chapter.lectures = await knex("lectures")
          .where({ chapter_id: chapter.id })
          .orderBy("lecture_order", "asc");
      }

      // Lấy thông tin enrollments count
      const enrollmentCount = await knex("enrollments")
        .where({ course_id: id })
        .count("user_id as count")
        .first();

      // Lấy thông tin reviews
      const reviews = await knex("reviews")
        .select("reviews.*", "users.full_name")
        .leftJoin("users", "reviews.user_id", "users.id")
        .where({ course_id: id })
        .orderBy("reviews.created_at", "desc");

      return {
        ...course,
        chapters,
        enrollment_count: parseInt(enrollmentCount?.count || 0),
        reviews,
      };
    } catch (error) {
      console.error("Find course details error:", error);
      return null;
    }
  },

  async addCourse(courseData) {
    try {
      console.log("Creating course with data:", courseData);

      // Kiểm tra dữ liệu đầu vào
      if (!courseData.title || !courseData.instructor_id) {
        const err = new Error("Tiêu đề và giảng viên là bắt buộc");
        err.code = "MISSING_REQUIRED_FIELDS";
        throw err;
      }

      // Chuẩn bị dữ liệu insert
      const insertData = {
        title: courseData.title.trim(),
        short_description: courseData.short_description?.trim() || "",
        detailed_description: courseData.detailed_description?.trim() || "",
        price: parseFloat(courseData.price) || 0,
        promotional_price: courseData.promotional_price
          ? parseFloat(courseData.promotional_price)
          : null,
        image_url: courseData.image_url?.trim() || null,
        status: courseData.status || "draft",
        instructor_id: courseData.instructor_id,
        category_id: courseData.category_id
          ? parseInt(courseData.category_id)
          : null,
        last_updated: new Date(),
      };

      console.log("Insert data:", insertData);

      // Thử insert với returning, nếu lỗi thì thử không returning
      let newCourse;
      try {
        [newCourse] = await knex("courses").insert(insertData).returning("*");
      } catch (returningError) {
        console.log("Returning not supported, trying without returning...");
        await knex("courses").insert(insertData);

        // Lấy course mới nhất
        newCourse = await knex("courses")
          .where({ title: insertData.title })
          .orderBy("id", "desc")
          .first();
      }

      console.log("Course created successfully:", newCourse);
      return newCourse;
    } catch (error) {
      console.error("Add course error details:", error);

      // Xử lý lỗi cụ thể
      if (error.code === "23503") {
        // Foreign key violation
        if (error.constraint && error.constraint.includes("instructor_id")) {
          const err = new Error("Giảng viên không tồn tại");
          err.code = "INSTRUCTOR_NOT_FOUND";
          throw err;
        } else if (
          error.constraint &&
          error.constraint.includes("category_id")
        ) {
          const err = new Error("Lĩnh vực không tồn tại");
          err.code = "CATEGORY_NOT_FOUND";
          throw err;
        }
      }

      if (error.code === "23505") {
        // Unique violation
        const err = new Error("Tiêu đề khóa học đã tồn tại");
        err.code = "COURSE_TITLE_EXISTS";
        throw err;
      }

      throw error;
    }
  },

  async patchCourse(id, courseData) {
    try {
      const updateData = {
        ...courseData,
        last_updated: new Date(),
      };

      await knex("courses").where({ id }).update(updateData);
      return await this.findCourseById(id);
    } catch (error) {
      console.error("Patch course error:", error);
      throw error;
    }
  },

  async delCourse(id) {
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
      console.error("Delete course error:", error);
      throw error;
    }
  },

  async findAllInstructors() {
    try {
      return await knex("users")
        .select("id", "full_name", "email")
        .where({ role: "instructor" })
        .orderBy("full_name", "asc");
    } catch (error) {
      console.error("Find all instructors error:", error);
      return [];
    }
  },

  /* ---------- USERS ---------- */
  async findAll() {
    try {
      return await knex("users")
        .select(
          "id",
          "full_name",
          "email",
          "role",
          "created_at",
          "profile_picture_url"
        )
        .orderBy("created_at", "desc");
    } catch (error) {
      console.error("Find all users error:", error);
      return [];
    }
  },

  async findById(id) {
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

  async findByEmail(email) {
    try {
      return await knex("users").where({ email }).first();
    } catch (error) {
      console.error("Get user by email error:", error);
      return null;
    }
  },

  async add(user) {
    try {
      const [newUser] = await knex("users")
        .insert(user)
        .returning(["id", "full_name", "email", "role", "created_at"]);
      return newUser;
    } catch (error) {
      console.error("Add user error:", error);
      throw error;
    }
  },

  async patch(id, user) {
    try {
      await knex("users").where({ id }).update(user);
      return this.findById(id);
    } catch (error) {
      console.error("Patch user error:", error);
      throw error;
    }
  },

  async del(id) {
    try {
      return await knex("users").where({ id }).del();
    } catch (error) {
      console.error("Delete user error:", error);
      throw error;
    }
  },

  async getCoursesByInstructor(instructorId) {
    try {
      return await knex("courses")
        .select("id", "title", "status", "price", "created_at")
        .where({ instructor_id: instructorId })
        .orderBy("created_at", "desc");
    } catch (error) {
      console.error("Get courses by instructor error:", error);
      return [];
    }
  },

  async getEnrolledCourses(userId) {
    try {
      return await knex("enrollments")
        .select(
          "courses.id",
          "courses.title",
          "courses.price",
          "enrollments.enrolled_at",
          "users.full_name as instructor_name"
        )
        .leftJoin("courses", "enrollments.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("enrollments.user_id", userId)
        .orderBy("enrollments.enrolled_at", "desc");
    } catch (error) {
      console.error("Get enrolled courses error:", error);
      return [];
    }
  },
};
