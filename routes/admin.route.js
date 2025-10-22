// routes/admin.route.js
import express from "express";
import adminModel from "../models/admin.model.js";
import bcrypt from "bcryptjs";

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
      error: "Không thể tải dữ liệu",
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
router.get("/categories", async (req, res) => {
  try {
    const data = await adminModel.listCategories();
    res.render("vwAdmin/categories", {
      title: "Quản lý lĩnh vực",
      categories: data.rows,
      total: data.total,
    });
  } catch (err) {
    console.error("Categories error:", err);
    res.render("vwAdmin/categories", {
      title: "Quản lý lĩnh vực",
      error: "Không thể tải dữ liệu",
      categories: [],
      total: 0,
    });
  }
});

// POST xử lý thêm / sửa / xóa category
router.post("/categories", async (req, res) => {
  try {
    const { action, id, name, parent_id } = req.body;

    if (action === "create") {
      await adminModel.createCategory({
        name,
        parent_id: parent_id || null,
      });
      req.session.flash = {
        type: "success",
        message: "Thêm lĩnh vực thành công",
      };
    } else if (action === "update") {
      await adminModel.updateCategory(id, {
        name,
        parent_id: parent_id || null,
      });
      req.session.flash = {
        type: "success",
        message: "Cập nhật lĩnh vực thành công",
      };
    } else if (action === "delete") {
      await adminModel.deleteCategory(id);
      req.session.flash = {
        type: "success",
        message: "Xóa lĩnh vực thành công",
      };
    }

    res.redirect("/admin/categories");
  } catch (err) {
    console.error("Category action error:", err);
    const data = await adminModel.listCategories();
    res.render("vwAdmin/categories", {
      error: err.message,
      categories: data.rows,
      total: data.total,
    });
  }
});

/* ============= COURSE ============= */
router.get("/courses", async (req, res) => {
  try {
    const data = await adminModel.listCourses();
    res.render("vwAdmin/courses", {
      title: "Quản lý khoá học",
      courses: data.rows,
    });
  } catch (err) {
    console.error("Courses error:", err);
    res.render("vwAdmin/courses", {
      title: "Quản lý khoá học",
      error: "Không thể tải dữ liệu",
      courses: [],
    });
  }
});

router.post("/courses/remove", async (req, res) => {
  try {
    await adminModel.removeCourse(req.body.id);
    req.session.flash = {
      type: "success",
      message: "Gỡ bỏ khóa học thành công",
    };
  } catch (err) {
    console.error("Remove course error:", err);
    req.session.flash = { type: "danger", message: err.message };
  }
  res.redirect("/admin/courses");
});

/* ============= USERS ============= */
router.get("/users", async (req, res) => {
  try {
    const data = await adminModel.listUsers();
    res.render("vwAdmin/users", {
      title: "Quản lý người dùng",
      users: data.rows,
    });
  } catch (err) {
    console.error("Users error:", err);
    res.render("vwAdmin/users", {
      title: "Quản lý người dùng",
      error: "Không thể tải dữ liệu",
      users: [],
    });
  }
});

router.post("/users", async (req, res) => {
  const { action, id, role } = req.body;

  try {
    if (action === "updateRole") {
      await adminModel.updateUserRole(id, role);
      req.session.flash = {
        type: "success",
        message: "Cập nhật vai trò thành công",
      };
    } else if (action === "delete") {
      await adminModel.deleteUser(id);
      req.session.flash = {
        type: "success",
        message: "Xóa người dùng thành công",
      };
    } else if (action === "createInstructor") {
      const { full_name, email, password, instructor_bio } = req.body;

      // Kiểm tra email đã tồn tại chưa
      const existingUser = await knex("users").where({ email }).first();
      if (existingUser) {
        req.session.flash = {
          type: "danger",
          message: "Email đã tồn tại trong hệ thống",
        };
        return res.redirect("/admin/users");
      }

      const password_hash = bcrypt.hashSync(password, 10);

      await adminModel.createInstructor({
        full_name,
        email,
        password_hash,
        instructor_bio: instructor_bio || null,
      });
      req.session.flash = {
        type: "success",
        message: "Tạo tài khoản giảng viên thành công",
      };
    }
  } catch (err) {
    console.error("User action error:", err);
    req.session.flash = { type: "danger", message: err.message };
  }

  res.redirect("/admin/users");
});

export default router;
