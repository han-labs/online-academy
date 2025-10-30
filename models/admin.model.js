// models/admin.model.js
import knex from "../utils/db.js";

export default {
  /* ---------- DASHBOARD STATS ---------- */
  async getDashboardStats() {
    try {
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

      const newCategory = await knex("categories")
        .where({ name: categoryData.name })
        .orderBy("id", "desc")
        .first();

      return newCategory;
    } catch (error) {
      console.error("Add category error:", error);

      if (error.code === "23505") {
        if (error.constraint === "categories_pkey") {
          const err = new Error("System error. Please try again.");
          err.code = "SEQUENCE_ERROR";
          throw err;
        } else if (error.constraint === "categories_name_unique") {
          const err = new Error("Category name already exists");
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
      const categoryId = parseInt(id, 10);

      const category = await knex("categories")
        .where({ id: categoryId })
        .first();
      if (!category) {
        const err = new Error("Category not found");
        err.code = "CATEGORY_NOT_FOUND";
        throw err;
      }

      const courseCount = await knex("courses")
        .where({ category_id: categoryId })
        .count("id as cnt")
        .first();

      const courseCountValue = parseInt(
        courseCount.cnt || courseCount.count || 0,
        10
      );

      if (courseCountValue > 0) {
        const err = new Error("Cannot delete: category has courses");
        err.code = "CATEGORY_HAS_COURSES";
        throw err;
      }

      const childrenCount = await knex("categories")
        .where({ parent_id: categoryId })
        .count("id as cnt")
        .first();

      const childrenCountValue = parseInt(
        childrenCount.cnt || childrenCount.count || 0,
        10
      );

      if (childrenCountValue > 0) {
        const err = new Error("Cannot delete: category has subcategories");
        err.code = "CATEGORY_HAS_CHILDREN";
        throw err;
      }

      const result = await knex("categories").where({ id: categoryId }).del();

      return result;
    } catch (error) {
      console.error("Delete category error:", error);

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

      const courseCount = await knex("courses")
        .where({ category_id: id })
        .count("id as cnt")
        .first();

      const childrenCount = await knex("categories")
        .where({ parent_id: id })
        .count("id as cnt")
        .first();

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

      const chapters = await knex("chapters")
        .where({ course_id: id })
        .orderBy("chapter_order", "asc");

      for (let chapter of chapters) {
        chapter.lectures = await knex("lectures")
          .where({ chapter_id: chapter.id })
          .orderBy("lecture_order", "asc");
      }

      const enrollmentCount = await knex("enrollments")
        .where({ course_id: id })
        .count("user_id as count")
        .first();

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
      if (!courseData.title || !courseData.instructor_id) {
        const err = new Error("Title and instructor are required");
        err.code = "MISSING_REQUIRED_FIELDS";
        throw err;
      }

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

      let newCourse;
      try {
        [newCourse] = await knex("courses").insert(insertData).returning("*");
      } catch (returningError) {
        await knex("courses").insert(insertData);

        newCourse = await knex("courses")
          .where({ title: insertData.title })
          .orderBy("id", "desc")
          .first();
      }

      return newCourse;
    } catch (error) {
      console.error("Add course error details:", error);

      if (error.code === "23503") {
        if (error.constraint && error.constraint.includes("instructor_id")) {
          const err = new Error("Instructor not found");
          err.code = "INSTRUCTOR_NOT_FOUND";
          throw err;
        } else if (
          error.constraint &&
          error.constraint.includes("category_id")
        ) {
          const err = new Error("Category not found");
          err.code = "CATEGORY_NOT_FOUND";
          throw err;
        }
      }

      if (error.code === "23505") {
        const err = new Error("Course title already exists");
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

        const chapterIds = await trx("chapters")
          .where({ course_id: id })
          .pluck("id");

        if (chapterIds.length) {
          await trx("lectures").whereIn("chapter_id", chapterIds).del();
          await trx("chapters").whereIn("id", chapterIds).del();
        }

        await trx("enrollments").where({ course_id: id }).del();
        await trx("reviews").where({ course_id: id }).del();
        await trx("watchlists").where({ course_id: id }).del();

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

  async getCourseFiltersData() {
    try {
      const [categories, instructors] = await Promise.all([
        knex("categories").select("id", "name").orderBy("name", "asc"),
        knex("users")
          .select("id", "full_name")
          .where("role", "instructor")
          .orderBy("full_name", "asc"),
      ]);

      return {
        categories: categories || [],
        instructors: instructors || [],
      };
    } catch (error) {
      console.error("Get course filters data error:", error);
      return { categories: [], instructors: [] };
    }
  },

  async findAllCoursesWithFilters(filters = {}) {
    try {
      let query = knex("courses")
        .select(
          "courses.*",
          "users.full_name as instructor_name",
          "categories.name as category_name"
        )
        .leftJoin("users", "courses.instructor_id", "users.id")
        .leftJoin("categories", "courses.category_id", "categories.id");

      if (filters.filter_type === "category" && filters.category_id) {
        query = query.where(
          "courses.category_id",
          parseInt(filters.category_id)
        );
      } else if (
        filters.filter_type === "instructor" &&
        filters.instructor_id
      ) {
        query = query.where("courses.instructor_id", filters.instructor_id);
      }

      const results = await query.orderBy("courses.id", "asc");
      return results;
    } catch (error) {
      console.error("Find all courses with filters error:", error);
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
          "is_active",
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
          "is_active",
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
      console.error("Find by email error:", error);
      return null;
    }
  },

  async add(userData) {
    try {
      const [newUser] = await knex("users").insert(userData).returning("*");
      return newUser;
    } catch (error) {
      console.error("Add user error:", error);
      throw error;
    }
  },

  async patch(id, userData) {
    try {
      await knex("users").where({ id }).update(userData);
      return await this.findById(id);
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

  async toggleUserStatus(id, is_active) {
    try {
      await knex("users").where({ id }).update({ is_active });
      return await this.findById(id);
    } catch (error) {
      console.error("Toggle user status error:", error);
      throw error;
    }
  },

  async deactivateUser(id) {
    return await this.toggleUserStatus(id, false);
  },

  async activateUser(id) {
    return await this.toggleUserStatus(id, true);
  },

  async getCoursesByInstructor(instructorId) {
    try {
      return await knex("courses")
        .where({ instructor_id: instructorId })
        .orderBy("created_at", "desc");
    } catch (error) {
      console.error("Get courses by instructor error:", error);
      return [];
    }
  },

  async getEnrolledCourses(studentId) {
    try {
      return await knex("enrollments")
        .select("courses.*", "users.full_name as instructor_name")
        .leftJoin("courses", "enrollments.course_id", "courses.id")
        .leftJoin("users", "courses.instructor_id", "users.id")
        .where("enrollments.student_id", studentId)
        .orderBy("enrollments.enrolled_at", "desc");
    } catch (error) {
      console.error("Get enrolled courses error:", error);
      return [];
    }
  },

  async getUserImpactAnalysis(userId) {
    try {
      const user = await this.findById(userId);
      if (!user) return null;

      let impact = {
        user,
        courses: [],
        enrollments: 0,
        reviews: 0,
      };

      if (user.role === "instructor") {
        impact.courses = await this.getCoursesByInstructor(userId);
      }

      const enrollmentCount = await knex("enrollments")
        .where({ user_id: userId })
        .count("user_id as count")
        .first();
      impact.enrollments = parseInt(enrollmentCount?.count || 0);

      const reviewCount = await knex("reviews")
        .where({ user_id: userId })
        .count("id as count")
        .first();
      impact.reviews = parseInt(reviewCount?.count || 0);

      return impact;
    } catch (error) {
      console.error("Get user impact analysis error:", error);
      return null;
    }
  },
};
