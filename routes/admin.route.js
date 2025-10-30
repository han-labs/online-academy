// routes/admin.route.js
import express from "express";
import adminModel from "../models/admin.model.js";
import bcrypt from "bcryptjs";
import upload from "../utils/upload.js";

const router = express.Router();

// Dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const stats = await adminModel.getDashboardStats();
    const recentCourses = await adminModel.getRecentCourses(5);

    res.render("vwAdmin/dashboard", {
      title: "Dashboard",
      stats,
      recentCourses,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("vwAdmin/dashboard", {
      title: "Dashboard",
      error: true,
      stats: {
        total_students: 0,
        total_instructors: 0,
        total_courses: 0,
        total_users: 0,
        total_revenue: 0,
      },
      recentCourses: [],
    });
  }
});

/* ============= CATEGORY ============= */
// Category list
router.get("/categories", async (req, res) => {
  try {
    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories: categories,
      categoriesHierarchy,
    });
  } catch (err) {
    console.error("Categories error:", err);
    res.render("vwAdmin/categories", {
      title: "Category Management",
      error: true,
      categories: [],
      categoriesHierarchy: { parentCategories: [], childCategories: [] },
    });
  }
});

// Add category form
router.get("/categories/add", async (req, res) => {
  try {
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/category.add.handlebars", {
      title: "Add New Category",
      categoriesHierarchy,
    });
  } catch (err) {
    console.error("Add category form error:", err);
    res.render("vwAdmin/category.add.handlebars", {
      title: "Add New Category",
      categoriesHierarchy: { parentCategories: [], childCategories: [] },
      error: true,
    });
  }
});

// Process add category
router.post("/categories/add", async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    await adminModel.addCategory({
      name,
      parent_id: parent_id || null,
    });

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      success: true,
    });
  } catch (err) {
    console.error("Add category error:", err);

    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/category.add.handlebars", {
      title: "Add New Category",
      categoriesHierarchy,
      error: true,
      formData: req.body,
    });
  }
});

// Edit category form
router.get("/categories/edit/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await adminModel.findCategoryById(categoryId);
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    if (!category) {
      const categories = await adminModel.findAllCategories();
      const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

      return res.render("vwAdmin/categories", {
        title: "Category Management",
        categories,
        categoriesHierarchy,
        error: true,
      });
    }

    res.render("vwAdmin/category.edit.handlebars", {
      title: `Edit: ${category.name}`,
      category,
      categoriesHierarchy,
    });
  } catch (err) {
    console.error("Edit category form error:", err);

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      error: true,
    });
  }
});

// Process edit category
router.post("/categories/edit/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, parent_id } = req.body;

    await adminModel.patchCategory(categoryId, {
      name,
      parent_id: parent_id || null,
    });

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      success: true,
    });
  } catch (err) {
    console.error("Edit category error:", err);

    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();
    const category = await adminModel.findCategoryById(req.params.id);

    res.render("vwAdmin/category.edit.handlebars", {
      title: `Edit: ${category.name}`,
      category,
      categoriesHierarchy,
      error: true,
      formData: req.body,
    });
  }
});

// View category details
router.get("/categories/detail/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryDetails = await adminModel.findCategoryWithDetails(
      categoryId
    );

    if (!categoryDetails) {
      const categories = await adminModel.findAllCategories();
      const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

      return res.render("vwAdmin/categories", {
        title: "Category Management",
        categories,
        categoriesHierarchy,
        error: true,
      });
    }

    res.render("vwAdmin/category.detail.handlebars", {
      title: `Details: ${categoryDetails.name}`,
      category: categoryDetails,
    });
  } catch (err) {
    console.error("Category detail error:", err);

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      error: true,
    });
  }
});

router.get("/categories/:id/check-delete", async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await adminModel.findCategoryWithDetails(categoryId);
    if (!category) {
      return res.json({ canDelete: false, reason: "not_found" });
    }

    const canDelete =
      category.course_count === 0 && category.children_count === 0;

    res.json({
      canDelete,
      courseCount: category.course_count,
      childrenCount: category.children_count,
    });
  } catch (err) {
    console.error("Check delete error:", err);
    res.status(500).json({ canDelete: false, reason: "server_error" });
  }
});

// Process delete category
router.post("/categories/delete/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Validate categoryId
    if (!categoryId || isNaN(categoryId)) {
      throw new Error("Invalid category ID");
    }

    await adminModel.delCategory(categoryId);

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      success: "Category deleted successfully!",
    });
  } catch (err) {
    console.error("Delete category route error:", err);

    const categories = await adminModel.findAllCategories();
    const categoriesHierarchy = await adminModel.findCategoriesHierarchy();

    let errorMessage = "An error occurred while deleting the category";

    // Handle specific error types
    if (err.code === "CATEGORY_HAS_COURSES") {
      errorMessage = err.message;
    } else if (err.code === "CATEGORY_HAS_CHILDREN") {
      errorMessage = err.message;
    } else if (err.code === "CATEGORY_NOT_FOUND") {
      errorMessage = err.message;
    } else {
      errorMessage = `Error: ${err.message}`;
    }

    res.render("vwAdmin/categories", {
      title: "Category Management",
      categories,
      categoriesHierarchy,
      error: errorMessage,
    });
  }
});

/* ============= COURSE ============= */
router.get("/courses", async (req, res) => {
  try {
    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses: courses,
    });
  } catch (err) {
    console.error("Courses error:", err);
    res.render("vwAdmin/courses", {
      title: "Course Management",
      error: true,
      courses: [],
    });
  }
});

// Add new course form
router.get("/courses/create", async (req, res) => {
  try {
    const instructors = await adminModel.findAllInstructors();
    const categories = await adminModel.findAllCategories();

    // If no instructors, show warning
    if (instructors.length === 0) {
      return res.render("vwAdmin/courseForm", {
        title: "Add New Course",
        course: {},
        instructors,
        categories,
        formAction: "/admin/courses/create",
        error: true,
      });
    }

    res.render("vwAdmin/courseForm", {
      title: "Add New Course",
      course: {},
      instructors,
      categories,
      formAction: "/admin/courses/create",
    });
  } catch (err) {
    console.error("Create course form error:", err);

    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses,
      error: true,
    });
  }
});

// Process add new course
router.post(
  "/courses/create",
  upload.single("course_image"),
  async (req, res) => {
    try {
      const {
        title,
        short_description,
        detailed_description,
        price,
        promotional_price,
        status,
        instructor_id,
        category_id,
      } = req.body;

      // Validate data
      if (!title || !title.trim()) {
        const instructors = await adminModel.findAllInstructors();
        const categories = await adminModel.findAllCategories();

        return res.render("vwAdmin/courseForm", {
          title: "Add New Course",
          course: req.body,
          instructors,
          categories,
          formAction: "/admin/courses/create",
          error: true,
        });
      }

      if (!instructor_id) {
        const instructors = await adminModel.findAllInstructors();
        const categories = await adminModel.findAllCategories();

        return res.render("vwAdmin/courseForm", {
          title: "Add New Course",
          course: req.body,
          instructors,
          categories,
          formAction: "/admin/courses/create",
          error: true,
        });
      }

      // Process image path
      let image_url = null;
      if (req.file) {
        image_url = "/uploads/courses/" + req.file.filename;
      }

      await adminModel.addCourse({
        title: title.trim(),
        short_description: short_description?.trim() || "",
        detailed_description: detailed_description?.trim() || "",
        price: price ? parseFloat(price) : 0,
        promotional_price: promotional_price
          ? parseFloat(promotional_price)
          : null,
        image_url: image_url,
        status: status || "draft",
        instructor_id: instructor_id,
        category_id: category_id ? parseInt(category_id) : null,
      });

      const courses = await adminModel.findAllCourses();
      res.render("vwAdmin/courses", {
        title: "Course Management",
        courses,
        success: true,
      });
    } catch (err) {
      console.error("Create course route error:", err);

      const instructors = await adminModel.findAllInstructors();
      const categories = await adminModel.findAllCategories();

      res.render("vwAdmin/courseForm", {
        title: "Add New Course",
        course: req.body,
        instructors,
        categories,
        formAction: "/admin/courses/create",
        error: true,
      });
    }
  }
);

// View course details
router.get("/courses/:id", async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await adminModel.findCourseDetails(courseId);

    if (!course) {
      const courses = await adminModel.findAllCourses();
      return res.render("vwAdmin/courses", {
        title: "Course Management",
        courses,
        error: true,
      });
    }

    res.render("vwAdmin/courseDetail", {
      title: `Details: ${course.title}`,
      course,
    });
  } catch (err) {
    console.error("Course detail error:", err);

    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses,
      error: true,
    });
  }
});

// Edit course form
router.get("/courses/:id/edit", async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await adminModel.findCourseById(courseId);
    const instructors = await adminModel.findAllInstructors();
    const categories = await adminModel.findAllCategories();

    if (!course) {
      const courses = await adminModel.findAllCourses();
      return res.render("vwAdmin/courses", {
        title: "Course Management",
        courses,
        error: true,
      });
    }

    res.render("vwAdmin/courseForm", {
      title: `Edit: ${course.title}`,
      course,
      instructors,
      categories,
      formAction: `/admin/courses/${courseId}/edit`,
    });
  } catch (err) {
    console.error("Edit course form error:", err);

    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses,
      error: true,
    });
  }
});

// Process edit course
router.post(
  "/courses/:id/edit",
  upload.single("course_image"),
  async (req, res) => {
    try {
      const courseId = req.params.id;
      const {
        title,
        short_description,
        detailed_description,
        price,
        promotional_price,
        status,
        instructor_id,
        category_id,
      } = req.body;

      // Process image path
      let updateData = {
        title,
        short_description,
        detailed_description,
        price: parseFloat(price) || 0,
        promotional_price: promotional_price
          ? parseFloat(promotional_price)
          : null,
        status,
        instructor_id,
        category_id: category_id ? parseInt(category_id) : null,
      };

      // Only update image_url if there's a new file
      if (req.file) {
        updateData.image_url = "/uploads/courses/" + req.file.filename;
      }

      await adminModel.patchCourse(courseId, updateData);

      const courses = await adminModel.findAllCourses();
      res.render("vwAdmin/courses", {
        title: "Course Management",
        courses,
        success: true,
      });
    } catch (err) {
      console.error("Update course error:", err);

      const instructors = await adminModel.findAllInstructors();
      const categories = await adminModel.findAllCategories();

      res.render("vwAdmin/courseForm", {
        title: `Edit: ${req.body.title}`,
        course: req.body,
        instructors,
        categories,
        formAction: `/admin/courses/${req.params.id}/edit`,
        error: true,
      });
    }
  }
);

// Delete course
router.post("/courses/delete", async (req, res) => {
  try {
    await adminModel.delCourse(req.body.id);

    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses,
      success: true,
    });
  } catch (err) {
    console.error("Delete course error:", err);

    const courses = await adminModel.findAllCourses();
    res.render("vwAdmin/courses", {
      title: "Course Management",
      courses,
      error: true,
    });
  }
});

/* ============= USERS ============= */
router.get("/users", async (req, res) => {
  try {
    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users: users,
    });
  } catch (err) {
    console.error("Users error:", err);
    res.render("vwAdmin/users", {
      title: "User Management",
      error: true,
      users: [],
    });
  }
});

// View user details
router.get("/users/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const userDetail = await adminModel.findById(userId);

    if (!userDetail) {
      const users = await adminModel.findAll();
      return res.render("vwAdmin/users", {
        title: "User Management",
        users,
        error: true,
      });
    }

    let courses = [];
    if (userDetail.role === "instructor") {
      courses = await adminModel.getCoursesByInstructor(userId);
    }

    let enrolledCourses = [];
    if (userDetail.role === "student") {
      enrolledCourses = await adminModel.getEnrolledCourses(userId);
    }

    res.render("vwAdmin/userDetail", {
      title: `Details: ${userDetail.full_name}`,
      userDetail,
      courses,
      enrolledCourses,
    });
  } catch (err) {
    console.error("User detail error:", err);

    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      error: true,
    });
  }
});

// Create new instructor
router.post("/users/create-instructor", async (req, res) => {
  try {
    const { full_name, email, password, instructor_bio } = req.body;

    // Check if email already exists
    const existingUser = await adminModel.findByEmail(email);
    if (existingUser) {
      const users = await adminModel.findAll();
      return res.render("vwAdmin/users", {
        title: "User Management",
        users,
        error: true,
      });
    }

    const password_hash = bcrypt.hashSync(password, 10);

    const newUser = {
      full_name,
      email,
      password_hash,
      role: "instructor",
      instructor_bio: instructor_bio || null,
      created_at: new Date(),
    };

    await adminModel.add(newUser);

    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      success: true,
    });
  } catch (err) {
    console.error("Create instructor error:", err);
    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      error: true,
    });
  }
});

// Update user information
router.post("/users/update", async (req, res) => {
  try {
    const { id, full_name, email, role, instructor_bio } = req.body;

    // Check if email already exists (excluding current user)
    if (email) {
      const existingUser = await adminModel.findByEmail(email);
      if (existingUser && existingUser.id !== parseInt(id)) {
        const users = await adminModel.findAll();
        return res.render("vwAdmin/users", {
          title: "User Management",
          users,
          error: true,
        });
      }
    }

    const updateData = {
      full_name,
      email,
      role,
    };

    // Only update instructor_bio if user is instructor
    if (role === "instructor") {
      updateData.instructor_bio = instructor_bio;
    } else {
      updateData.instructor_bio = null;
    }

    await adminModel.patch(id, updateData);

    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      success: true,
    });
  } catch (err) {
    console.error("Update user error:", err);
    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      error: true,
    });
  }
});

// Delete user
router.post("/users/delete", async (req, res) => {
  try {
    const { id } = req.body;
    await adminModel.del(id);

    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      success: true,
    });
  } catch (err) {
    console.error("Delete user error:", err);

    const users = await adminModel.findAll();
    res.render("vwAdmin/users", {
      title: "User Management",
      users,
      error: true,
    });
  }
});

// Toggle user status (activate/deactivate)
router.post("/users/toggle-status", async (req, res) => {
  try {
    const { id, action } = req.body; // action: 'activate' or 'deactivate'

    if (!id || !action) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    let user;
    if (action === "deactivate") {
      user = await adminModel.deactivateUser(id); // SỬA: gọi deactivateUser
    } else if (action === "activate") {
      user = await adminModel.activateUser(id); // SỬA: gọi activateUser
    }

    res.json({
      success: true,
      message: `Đã ${
        action === "deactivate" ? "khóa" : "mở khóa"
      } tài khoản thành công`,
      user,
    });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thay đổi trạng thái tài khoản",
    });
  }
});

// Get user impact analysis before deactivation
router.get("/users/:id/impact-analysis", async (req, res) => {
  try {
    const userId = req.params.id;
    const impact = await adminModel.getUserImpactAnalysis(userId);

    if (!impact) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      impact,
    });
  } catch (err) {
    console.error("Get user impact analysis error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi phân tích ảnh hưởng",
    });
  }
});

// Bulk user actions
router.post("/users/bulk-actions", async (req, res) => {
  try {
    const { userIds, action } = req.body;

    if (!userIds || !Array.isArray(userIds) || !action) {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    const results = [];
    for (const userId of userIds) {
      try {
        let user;
        if (action === "deactivate") {
          user = await adminModel.deactivateUser(userId);
        } else if (action === "activate") {
          user = await adminModel.activateUser(userId);
        } else if (action === "delete") {
          await adminModel.del(userId);
          user = { id: userId, deleted: true };
        }
        results.push({ userId, success: true, user });
      } catch (error) {
        results.push({ userId, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      message: `Đã xử lý ${successCount} tài khoản thành công, ${failCount} thất bại`,
      results,
    });
  } catch (err) {
    console.error("Bulk user actions error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xử lý hàng loạt",
    });
  }
});

export default router;
