// cSpell:disable
const express = require("express");
const cors = require("cors");
const app = express();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const booksDir = path.join(__dirname, "uploads", "books");

if (!fs.existsSync(booksDir)) {
  fs.mkdirSync(booksDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, booksDir);
  },
  filename: (req, file, cb) => {
  const ext = path.extname(file.originalname) || ".pdf";
  cb(null, `book-${Date.now()}${ext}`);
}
});

const uploadBook = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("يسمح فقط برفع ملفات PDF"));
    }
  }
});
//  الاتصال بقاعدة البيانات (مثال)
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "1234",
  database: "SchoolDBN"
});

db.connect(err => {
  if (err) {
    console.log("DB ERROR:", err);
  } else {
    console.log("Database connected");
  }
});

app.get("/", (req, res) => {
  res.send("Backend is working 🚀");
});

// Admin login
app.post("/admin/login", (req, res) => {
  const { naturalId, password } = req.body;

  const query = `
    SELECT * FROM Admin 
    WHERE NaturalID = ? AND Password = ?
  `;

  db.query(query, [naturalId, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Server error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ error: "بيانات غير صحيحة" });
    }

    const admin = result[0];

    res.json({
      success: true,
      admin: {
        NaturalID: admin.NaturalID,
        SemesterID: admin.SemesterID
      }
    });
  });
});


// User login (Student / Teacher)
app.post("/login", (req, res) => {
  const { naturalId, password } = req.body;

  const query = `
    SELECT *
    FROM Users
    WHERE NaturalID = ? AND Password = ?
  `;

  db.query(query, [naturalId, password], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Server error" });
    }

    if (result.length === 0) {
      return res.status(401).json({ error: "بيانات غير صحيحة" });
    }

    const user = result[0];

    // إذا معلم
    
    if (user.Type === "teacher") {
      const teacherQuery = `
        SELECT e.*, s.SemesterName
        FROM Employees e
        JOIN Semesters s ON e.SemesterID = s.SemesterID
        WHERE e.NaturalID = ? AND e.SemesterID = ?
      `;

      db.query(teacherQuery, [user.NaturalID, user.SemesterID], (err2, teacherResult) => {
        if (err2) {
          console.log(err2);
          return res.status(500).json({ error: "Server error" });
        }

        res.json({
          success: true,
          user: {
            naturalId: user.NaturalID,
            semesterId: user.SemesterID,
            type: user.Type
          },
          employee: teacherResult.length > 0 ? {
            naturalId: teacherResult[0].NaturalID,
            semesterId: teacherResult[0].SemesterID,
            fullName: teacherResult[0].FullName,
            jobTitle: teacherResult[0].JobTitle,
            hireDate: teacherResult[0].HireDate,
            photo: teacherResult[0].Photo,
            phone: teacherResult[0].Phone,
            semesterName: teacherResult[0].SemesterName
          } : null
        });
      });

      return;
    }

    // إذا طالب
    if (user.Type === "student") {
      const studentQuery = `
        SELECT st.*, s.SemesterName
        FROM Students st
        JOIN Semesters s ON st.SemesterID = s.SemesterID
        WHERE st.NaturalID = ? AND st.SemesterID = ?
      `;

      db.query(studentQuery, [user.NaturalID, user.SemesterID], (err3, studentResult) => {
        if (err3) {
          console.log(err3);
          return res.status(500).json({ error: "Server error" });
        }

        res.json({
          success: true,
          user: {
            naturalId: user.NaturalID,
            semesterId: user.SemesterID,
            type: user.Type
          },
          student: studentResult.length > 0 ? {
            naturalId: studentResult[0].NaturalID,
            semesterId: studentResult[0].SemesterID,
            fullName: studentResult[0].FullName,
            birthDate: studentResult[0].BirthDate,
            address: studentResult[0].Address,
            guardianPhone: studentResult[0].GuardianPhone,
            enrollmentDate: studentResult[0].EnrollmentDate,
            semesterName: studentResult[0].SemesterName
          } : null
        });
      });

      return;
    }

    res.json({
      success: true,
      user: {
        naturalId: user.NaturalID,
        semesterId: user.SemesterID,
        type: user.Type
      }
    });
  });
});
// ===============================
//  Semesters API (CRUD)
// ===============================

// ✅ GET all semesters
app.get("/semesters", (req, res) => {
  const query = "SELECT * FROM Semesters";

  db.query(query, (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Server error" });
    }

    res.json(result);
  });
});

// ✅ POST add semester
app.post("/semesters", (req, res) => {
  const { SemesterID, SemesterName } = req.body;

  const query = `
    INSERT INTO Semesters (SemesterID, SemesterName)
    VALUES (?, ?)
  `;

  db.query(query, [SemesterID, SemesterName], (err, result) => {
    if (err) {
      console.log(err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "هذا الفصل موجود مسبقاً" });
      }

      return res.status(500).json({ error: "خطأ في الإضافة" });
    }

    res.json({ success: true });
  });
});

// ✅ PUT update semester
app.put("/semesters/:id", (req, res) => {
  const { id } = req.params;
  const { SemesterName } = req.body;

  const query = `
    UPDATE Semesters
    SET SemesterName = ?
    WHERE SemesterID = ?
  `;

  db.query(query, [SemesterName, id], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في التعديل" });
    }

    res.json({ success: true });
  });
});

// ✅ DELETE semester
app.delete("/semesters/:id", (req, res) => {
  const { id } = req.params;

  const query = `
    DELETE FROM Semesters
    WHERE SemesterID = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err) {
      console.log(err);

      return res.status(500).json({
        error: "لا يمكن حذف الفصل (مرتبط ببيانات أخرى)"
      });
    }

    res.json({ success: true });
  });
});


// 🔹 جلب كل الصفوف
app.get("/classes", (req, res) => {
  const { semesterId } = req.query;

  const sql = "SELECT * FROM Classes WHERE SemesterID = ? ORDER BY ClassID ASC";
  
  db.query(sql, [semesterId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// 🔹 إضافة صف
app.post("/classes", (req, res) => {
  const { ClassName, SemesterID } = req.body;

  const sql = `
    INSERT INTO Classes (ClassName, SemesterID)
    VALUES (?, ?)
  `;

  db.query(sql, [ClassName, SemesterID], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Class added" });
  });
});

// 🔹 تعديل صف
app.put("/classes/:id", (req, res) => {
  const { ClassName } = req.body;

  db.query(
    "UPDATE Classes SET ClassName=? WHERE ClassID=?",
    [ClassName, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Updated" });
    }
  );
});

// 🔹 حذف صف
app.delete("/classes/:id", (req, res) => {
  db.query(
    "DELETE FROM Classes WHERE ClassID=?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Deleted" });
    }
  );
});
//  Sections API 
app.get("/sections", (req, res) => {
  const { semesterId } = req.query;

  if (!semesterId) {
    return res.status(400).json({ error: "SemesterID is required" });
  }

  const sql = `
    SELECT s.SectionID, s.SectionName, s.ClassID, c.ClassName
    FROM Sections s
    JOIN Classes c ON s.ClassID = c.ClassID
    WHERE s.SemesterID = ?
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/sections", (req, res) => {
  const { SectionName, ClassID, SemesterID } = req.body;

  if (!SectionName || !ClassID || !SemesterID) {
    return res.status(400).json({ error: "Missing data" });
  }

  const sql = `
    INSERT INTO Sections (SectionName, ClassID, SemesterID)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [SectionName, ClassID, SemesterID], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Section added" });
  });
});
// 🔹 تعديل شعبة
app.put("/sections/:id", (req, res) => {
  const { SectionName } = req.body;
  const { id } = req.params;

  if (!SectionName) return res.status(400).json({ error: "SectionName required" });

  const sql = "UPDATE Sections SET SectionName=? WHERE SectionID=?";
  db.query(sql, [SectionName, id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Section updated" });
  });
});

// 🔹 حذف شعبة
app.delete("/sections/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM Sections WHERE SectionID=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Section deleted" });
  });
});
// Subjects
app.get("/subjects", (req, res) => {
  const { semesterId } = req.query;

  if (!semesterId) {
    return res.status(400).json({ error: "SemesterID is required" });
  }

  const sql = `
    SELECT s.SubjectID, s.SubjectName, s.ClassID, s.IconId, c.ClassName
    FROM Subjects s
    JOIN Classes c ON s.ClassID = c.ClassID
    WHERE s.SemesterID = ?
    ORDER BY s.ClassID ASC, s.SubjectID ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/subjects", (req, res) => {
  const { SubjectName, ClassID, SemesterID, IconId } = req.body;

  if (!SubjectName || !ClassID || !SemesterID) {
    return res.status(400).json({ error: "Missing data" });
  }

  const sql = `
    INSERT INTO Subjects (SubjectName, ClassID, SemesterID, IconId)
    VALUES (?, ?, ?, ?)
  `;

  db.query(
    sql,
    [SubjectName, ClassID, SemesterID, IconId || "book"],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Subject added" });
    }
  );
});

app.put("/subjects/:id", (req, res) => {
  const { id } = req.params;
  const { SubjectName, IconId } = req.body;

  const sql = `
    UPDATE Subjects
    SET SubjectName = ?, IconId = ?
    WHERE SubjectID = ?
  `;

  db.query(sql, [SubjectName, IconId || "book", id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Updated" });
  });
});

app.delete("/subjects/:id", (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM Subjects WHERE SubjectID = ?`;

  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Deleted" });
  });
});
// employees
//grade-scheme
app.get("/grade-scheme/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT 
      gs.SchemeID,
      gt.GradeTypeName,
      gs.MaxGrade
    FROM Grade_Scheme gs
    JOIN Grade_Type gt ON gs.GradeTypeID = gt.GradeTypeID
    WHERE gs.SemesterID = ?
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
app.post("/grade-scheme", (req, res) => {
  const { name, maxGrade, semesterId } = req.body;

  const insertType = `INSERT INTO Grade_Type (GradeTypeName) VALUES (?)`;

  db.query(insertType, [name], (err, result) => {
    if (err) return res.status(500).json(err);

    const gradeTypeId = result.insertId;

    const insertScheme = `
      INSERT INTO Grade_Scheme (SemesterID, GradeTypeID, MaxGrade)
      VALUES (?, ?, ?)
    `;

    db.query(insertScheme, [semesterId, gradeTypeId, maxGrade], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "added" });
    });
  });
});
app.delete("/grade-scheme/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM Grade_Scheme WHERE SchemeID = ?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "deleted" });
  });
});
app.put("/grade-scheme/:id", (req, res) => {
  const { id } = req.params;
  const { name, maxGrade } = req.body;

  const update = `
    UPDATE Grade_Scheme gs
    JOIN Grade_Type gt ON gs.GradeTypeID = gt.GradeTypeID
    SET gt.GradeTypeName = ?, gs.MaxGrade = ?
    WHERE gs.SchemeID = ?
  `;

  db.query(update, [name, maxGrade, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "updated" });
  });
});
// ===============================
// Periods API
// ===============================

// جلب الصفوف حسب السمستر
app.get("/classes/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  db.query(
    "SELECT * FROM Classes WHERE SemesterID = ? ORDER BY ClassID ASC",
    [semesterId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "خطأ في جلب الصفوف" });
      }

      res.json(result);
    }
  );
});

// جلب الشعب حسب الصف والسمستر
app.get("/periods/sections/:classId/:semesterId", (req, res) => {
  const { classId, semesterId } = req.params;

  db.query(
    "SELECT * FROM Sections WHERE ClassID = ? AND SemesterID = ? ORDER BY SectionName ASC",
    [classId, semesterId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "خطأ في جلب الشعب" });
      }

      res.json(result);
    }
  );
});

// جلب المواد حسب الصف والسمستر
app.get("/periods/subjects/:classId/:semesterId", (req, res) => {
  const { classId, semesterId } = req.params;

  db.query(
    "SELECT * FROM Subjects WHERE ClassID = ? AND SemesterID = ? ORDER BY SubjectName ASC",
    [classId, semesterId],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "خطأ في جلب المواد" });
      }

      res.json(result);
    }
  );
});

// جلب الحصص حسب السمستر
app.get("/periods/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT 
      p.PeriodID,
      p.DayOfWeek,
      p.PeriodNumber,
      c.ClassName,
      s.SectionName,
      sub.SubjectName
    FROM Periods p
    JOIN Sections s ON p.SectionID = s.SectionID
    JOIN Classes c ON s.ClassID = c.ClassID
    JOIN Subjects sub ON p.SubjectID = sub.SubjectID
    WHERE p.SemesterID = ?
    ORDER BY c.ClassName, s.SectionName, p.DayOfWeek, p.PeriodNumber
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب الحصص" });
    }

    res.json(result);
  });
});

// إضافة حصة
app.post("/periods", (req, res) => {
  const { sectionId, subjectId, semesterId, day, periodNumber } = req.body;

  if (!sectionId || !subjectId || !semesterId || !day || !periodNumber) {
    return res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
  }

  // 1) فحص تعارض الشعبة
  const checkSectionSql = `
    SELECT *
    FROM Periods
    WHERE SectionID = ? AND SemesterID = ? AND DayOfWeek = ? AND PeriodNumber = ?
  `;

  db.query(
    checkSectionSql,
    [sectionId, semesterId, day, periodNumber],
    (sectionErr, sectionResult) => {
      if (sectionErr) {
        console.log(sectionErr);
        return res.status(500).json({ error: "خطأ في التحقق من تعارض الشعبة" });
      }

      if (sectionResult.length > 0) {
        return res.status(400).json({
          error: "هذه الحصة موجودة مسبقاً لنفس الشعبة وفي نفس اليوم ونفس رقم الحصة"
        });
      }

      // 2) نجيب المعلم المرتبط بهذه المادة في هذه الشعبة
      const getTeacherSql = `
        SELECT NaturalID
        FROM Section_Subject_Employees
        WHERE SectionID = ? AND SubjectID = ? AND SemesterID = ?
        LIMIT 1
      `;

      db.query(
        getTeacherSql,
        [sectionId, subjectId, semesterId],
        (teacherErr, teacherResult) => {
          if (teacherErr) {
            console.log(teacherErr);
            return res.status(500).json({ error: "خطأ في جلب بيانات المعلم" });
          }

          if (teacherResult.length === 0) {
            return res.status(400).json({
              error: "لا يوجد معلم مربوط بهذه المادة في هذه الشعبة"
            });
          }

          const teacherId = teacherResult[0].NaturalID;

          // 3) فحص تعارض المعلم
          const checkTeacherConflictSql = `
            SELECT
              p.PeriodID,
              c.ClassName,
              s.SectionName,
              sub.SubjectName
            FROM Periods p
            JOIN Section_Subject_Employees sse
              ON p.SectionID = sse.SectionID
              AND p.SubjectID = sse.SubjectID
              AND p.SemesterID = sse.SemesterID
            JOIN Sections s
              ON p.SectionID = s.SectionID
            JOIN Classes c
              ON s.ClassID = c.ClassID
            JOIN Subjects sub
              ON p.SubjectID = sub.SubjectID
            WHERE sse.NaturalID = ?
              AND p.SemesterID = ?
              AND p.DayOfWeek = ?
              AND p.PeriodNumber = ?
            LIMIT 1
          `;

          db.query(
            checkTeacherConflictSql,
            [teacherId, semesterId, day, periodNumber],
            (conflictErr, conflictResult) => {
              if (conflictErr) {
                console.log(conflictErr);
                return res.status(500).json({ error: "خطأ في التحقق من تعارض المعلم" });
              }

              if (conflictResult.length > 0) {
                const conflict = conflictResult[0];
                return res.status(400).json({
                  error: `هذا المعلم لديه حصة أخرى في نفس الوقت (${conflict.ClassName} - شعبة ${conflict.SectionName} - ${conflict.SubjectName})`
                });
              }

              // 4) الإدخال إذا ما في تعارض
              const insertSql = `
                INSERT INTO Periods (SectionID, SubjectID, SemesterID, DayOfWeek, PeriodNumber)
                VALUES (?, ?, ?, ?, ?)
              `;

              db.query(
                insertSql,
                [sectionId, subjectId, semesterId, day, periodNumber],
                (insertErr) => {
                  if (insertErr) {
                    console.log(insertErr);
                    return res.status(500).json({ error: "فشل إضافة الحصة" });
                  }

                  res.json({
                    success: true,
                    message: "تمت إضافة الحصة بنجاح"
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// حذف حصة
app.delete("/periods/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM Periods WHERE PeriodID = ?", [id], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في حذف الحصة" });
    }

    res.json({ success: true, message: "تم الحذف" });
  });
});
// ===============================
// Students API
// ===============================

// جلب الطلاب حسب السمستر
app.get("/students/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT *
    FROM Students
    WHERE SemesterID = ?
    ORDER BY FullName ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب الطلاب" });
    }

    res.json(result);
  });
});

// إضافة طالب
// يضاف أولاً إلى Users ثم إلى Students
app.post("/students", (req, res) => {
  const {
    naturalId,
    fullName,
    birthDate,
    address,
    guardianPhone,
    enrollmentDate,
    semesterId
  } = req.body;

  if (!naturalId || !fullName || !semesterId) {
    return res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
  }

  const insertUserSql = `
    INSERT INTO Users (NaturalID, SemesterID, Password, Type)
    VALUES (?, ?, ?, 'student')
  `;

  db.query(insertUserSql, [naturalId, semesterId, naturalId], (err) => {
    if (err) {
      console.log(err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "الطالب موجود مسبقاً" });
      }

      return res.status(500).json({ error: "خطأ في إضافة المستخدم" });
    }

    const insertStudentSql = `
      INSERT INTO Students (
        NaturalID,
        SemesterID,
        FullName,
        BirthDate,
        Address,
        GuardianPhone,
        EnrollmentDate
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertStudentSql,
      [
        naturalId,
        semesterId,
        fullName,
        birthDate || null,
        address || null,
        guardianPhone || null,
        enrollmentDate || null
      ],
      (err2) => {
        if (err2) {
          console.log(err2);

          // rollback بسيط: نحذف من Users إذا فشل Students
          db.query(
            "DELETE FROM Users WHERE NaturalID = ? AND SemesterID = ?",
            [naturalId, semesterId],
            () => {}
          );

          return res.status(500).json({ error: "خطأ في إضافة الطالب" });
        }

        res.json({ success: true, message: "تمت إضافة الطالب بنجاح" });
      }
    );
  });
});

// تعديل طالب
app.put("/students/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;
  const {
    fullName,
    birthDate,
    address,
    guardianPhone,
    enrollmentDate
  } = req.body;

  const sql = `
    UPDATE Students
    SET
      FullName = ?,
      BirthDate = ?,
      Address = ?,
      GuardianPhone = ?,
      EnrollmentDate = ?
    WHERE NaturalID = ? AND SemesterID = ?
  `;

  db.query(
    sql,
    [
      fullName,
      birthDate || null,
      address || null,
      guardianPhone || null,
      enrollmentDate || null,
      naturalId,
      semesterId
    ],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: "خطأ في تعديل الطالب" });
      }

      res.json({ success: true, message: "تم تعديل الطالب" });
    }
  );
});

// حذف طالب
// نحذف من Users وسيُحذف من Students تلقائياً بسبب ON DELETE CASCADE
app.delete("/students/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    DELETE FROM Users
    WHERE NaturalID = ? AND SemesterID = ?
  `;

  db.query(sql, [naturalId, semesterId], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في حذف الطالب" });
    }

    res.json({ success: true, message: "تم حذف الطالب" });
  });
});
// ===============================
// Teachers API
// ===============================

// جلب المعلمين حسب السمستر
app.get("/teachers/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT *
    FROM Employees
    WHERE SemesterID = ?
    ORDER BY FullName ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب المعلمين" });
    }

    res.json(result);
  });
});
// ===============================
// 📸 Teachers Images Upload Setup
// ===============================

const teachersDir = path.join(__dirname, "uploads", "teachers");

if (!fs.existsSync(teachersDir)) {
  fs.mkdirSync(teachersDir, { recursive: true });
}

const teacherStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, teachersDir);
  },
  filename: (req, file, cb) => {
    const naturalId = req.body.naturalId || req.params.naturalId;

    if (!naturalId) {
      return cb(new Error("رقم الهوية مطلوب"), "");
    }

    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${naturalId}${ext}`);
  }
});

const uploadTeacherPhoto = multer({
  storage: teacherStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("يسمح فقط برفع الصور"));
    }
  }
});
// إضافة معلم
// يضاف أولاً إلى Users ثم إلى Employees
app.post("/teachers", uploadTeacherPhoto.single("photo"), (req, res) => {
  const {
    naturalId,
    fullName,
    jobTitle,
    phone,
    hireDate,
    semesterId
  } = req.body;

  const photo = req.file ? req.file.filename : null;

  if (!naturalId || !fullName || !semesterId) {
    return res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
  }

  const insertUserSql = `
    INSERT INTO Users (NaturalID, SemesterID, Password, Type)
    VALUES (?, ?, ?, 'teacher')
  `;

  db.query(insertUserSql, [naturalId, semesterId, naturalId], (err) => {
    if (err) {
      console.log(err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "المعلم موجود مسبقاً" });
      }

      return res.status(500).json({ error: "خطأ في إضافة المستخدم" });
    }

    const insertTeacherSql = `
      INSERT INTO Employees (
        NaturalID,
        SemesterID,
        FullName,
        JobTitle,
        HireDate,
        Photo,
        Phone
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertTeacherSql,
      [
        naturalId,
        semesterId,
        fullName,
        jobTitle || null,
        hireDate || null,
        photo,
        phone || null
      ],
      (err2) => {
        if (err2) {
          console.log(err2);

          db.query(
            "DELETE FROM Users WHERE NaturalID = ? AND SemesterID = ?",
            [naturalId, semesterId],
            () => {}
          );

          return res.status(500).json({ error: "خطأ في إضافة المعلم" });
        }

        res.json({ success: true, message: "تمت إضافة المعلم بنجاح" });
      }
    );
  });
});
app.post("/teachers/bulk", async (req, res) => {
  const { semesterId, teachers } = req.body;

  if (!semesterId || !Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ error: "semesterId و teachers مطلوبين" });
  }

  try {
    const promiseDb = db.promise();
    const inserted = [];
    const skipped = [];

    for (const teacher of teachers) {
      const {
        naturalId,
        fullName,
        jobTitle,
        phone,
        hireDate,
        photo
      } = teacher;

      if (!naturalId || !fullName) {
        skipped.push({ naturalId, fullName, reason: "بيانات ناقصة" });
        continue;
      }

      const [existingUsers] = await promiseDb.query(
        `SELECT * FROM Users WHERE NaturalID = ? AND SemesterID = ?`,
        [naturalId, semesterId]
      );

      if (existingUsers.length > 0) {
        skipped.push({ naturalId, fullName, reason: "موجود مسبقاً" });
        continue;
      }

      await promiseDb.query(
        `
        INSERT INTO Users (NaturalID, SemesterID, Password, Type)
        VALUES (?, ?, ?, 'teacher')
        `,
        [naturalId, semesterId, naturalId]
      );

      await promiseDb.query(
        `
        INSERT INTO Employees (NaturalID, SemesterID, FullName, JobTitle, HireDate, Photo, Phone)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          naturalId,
          semesterId,
          fullName,
          jobTitle || null,
          hireDate || null,
          photo || null,
          phone || null
        ]
      );

      inserted.push({ naturalId, fullName });
    }

    res.json({
      success: true,
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      inserted,
      skipped
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "فشل إضافة المعلمين",
      details: err.message
    });
  }
});
// تعديل معلم
app.put("/teachers/:naturalId/:semesterId", uploadTeacherPhoto.single("photo"), (req, res) => {
  const { naturalId, semesterId } = req.params;
  const { fullName, jobTitle, phone, hireDate } = req.body;

  const getOldPhotoSql = `
    SELECT Photo
    FROM Employees
    WHERE NaturalID = ? AND SemesterID = ?
  `;

  db.query(getOldPhotoSql, [naturalId, semesterId], (selectErr, result) => {
    if (selectErr) {
      console.log(selectErr);
      return res.status(500).json({ error: "خطأ في تحميل بيانات المعلم" });
    }

    const oldPhoto = result.length > 0 ? result[0].Photo : null;
    const newPhoto = req.file ? req.file.filename : oldPhoto;

    const sql = `
      UPDATE Employees
      SET
        FullName = ?,
        JobTitle = ?,
        Phone = ?,
        HireDate = ?,
        Photo = ?
      WHERE NaturalID = ? AND SemesterID = ?
    `;

    db.query(
      sql,
      [
        fullName,
        jobTitle || null,
        phone || null,
        hireDate || null,
        newPhoto,
        naturalId,
        semesterId
      ],
      (err) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ error: "خطأ في تعديل المعلم" });
        }

        res.json({ success: true, message: "تم تعديل المعلم" });
      }
    );
  });
});
// حذف معلم
// نحذف من Users وسيُحذف من Employees تلقائياً بسبب ON DELETE CASCADE
app.delete("/teachers/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const selectSql = `
    SELECT Photo
    FROM Employees
    WHERE NaturalID = ? AND SemesterID = ?
  `;

  db.query(selectSql, [naturalId, semesterId], (selectErr, result) => {
    if (selectErr) {
      console.log(selectErr);
      return res.status(500).json({ error: "خطأ في تحميل بيانات المعلم" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "المعلم غير موجود" });
    }

    const currentPhoto = result[0].Photo;

    const deleteSql = `
      DELETE FROM Users
      WHERE NaturalID = ? AND SemesterID = ?
    `;

    db.query(deleteSql, [naturalId, semesterId], (deleteErr) => {
      if (deleteErr) {
        console.log(deleteErr);
        return res.status(500).json({ error: "خطأ في حذف المعلم" });
      }

      if (currentPhoto) {
        const fullPhotoPath = path.join(teachersDir, currentPhoto);

        fs.unlink(fullPhotoPath, (unlinkErr) => {
          if (unlinkErr) {
            console.log("TEACHER PHOTO DELETE WARNING:", unlinkErr.message);
          }
        });
      }

      res.json({ success: true, message: "تم حذف المعلم بنجاح" });
    });
  });
});
// ===============================
// Relations API
// ===============================

// جلب الصفوف حسب السمستر
app.get("/relations/classes/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT *
    FROM Classes
    WHERE SemesterID = ?
    ORDER BY ClassID ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب الصفوف" });
    }

    res.json(result);
  });
});

// جلب الشعب حسب الصف والسمستر
app.get("/relations/sections/:classId/:semesterId", (req, res) => {
  const { classId, semesterId } = req.params;

  const sql = `
    SELECT *
    FROM Sections
    WHERE ClassID = ? AND SemesterID = ?
    ORDER BY SectionName ASC
  `;

  db.query(sql, [classId, semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب الشعب" });
    }

    res.json(result);
  });
});

// جلب المواد حسب الصف والسمستر
app.get("/relations/subjects/:classId/:semesterId", (req, res) => {
  const { classId, semesterId } = req.params;

  const sql = `
    SELECT *
    FROM Subjects
    WHERE ClassID = ? AND SemesterID = ?
    ORDER BY SubjectName ASC
  `;

  db.query(sql, [classId, semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب المواد" });
    }

    res.json(result);
  });
});

// جلب الطلاب حسب السمستر
app.get("/relations/students/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT NaturalID, FullName
    FROM Students
    WHERE SemesterID = ?
    ORDER BY FullName ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب الطلاب" });
    }

    res.json(result);
  });
});

// جلب المعلمين حسب السمستر
app.get("/relations/teachers/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT NaturalID, FullName
    FROM Employees
    WHERE SemesterID = ?
    ORDER BY FullName ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب المعلمين" });
    }

    res.json(result);
  });
});

// جلب ربط الطلاب بالشعب
app.get("/relations/section-students/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT
      ss.SectionID,
      ss.NaturalID,
      ss.SemesterID,
      s.SectionName,
      c.ClassName,
      st.FullName AS StudentName
    FROM Section_Students ss
    JOIN Sections s
      ON ss.SectionID = s.SectionID
    JOIN Classes c
      ON s.ClassID = c.ClassID
    JOIN Students st
      ON ss.NaturalID = st.NaturalID
      AND ss.SemesterID = st.SemesterID
    WHERE ss.SemesterID = ?
    ORDER BY c.ClassName, s.SectionName, st.FullName
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب ربط الطلاب" });
    }

    res.json(result);
  });
});

// إضافة طالب إلى شعبة
app.post("/relations/section-students", (req, res) => {
  const { sectionId, naturalId, semesterId } = req.body;

  if (!sectionId || !naturalId || !semesterId) {
    return res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
  }

  // التحقق إذا الطالب مربوط مسبقاً بأي شعبة في نفس السمستر
  const checkSql = `
    SELECT
      ss.SectionID,
      s.SectionName,
      c.ClassName
    FROM Section_Students ss
    JOIN Sections s
      ON ss.SectionID = s.SectionID
    JOIN Classes c
      ON s.ClassID = c.ClassID
    WHERE ss.NaturalID = ? AND ss.SemesterID = ?
    LIMIT 1
  `;

  db.query(checkSql, [naturalId, semesterId], (checkErr, checkResult) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: "خطأ في التحقق من ربط الطالب" });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        error: `هذا الطالب مربوط مسبقاً في ${checkResult[0].ClassName} - شعبة ${checkResult[0].SectionName}`
      });
    }

    const insertSql = `
      INSERT INTO Section_Students (SectionID, NaturalID, SemesterID)
      VALUES (?, ?, ?)
    `;

    db.query(insertSql, [sectionId, naturalId, semesterId], (insertErr) => {
      if (insertErr) {
        console.log(insertErr);

        if (insertErr.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "الطالب مربوط بهذه الشعبة مسبقاً" });
        }

        return res.status(500).json({ error: "خطأ في إضافة الطالب إلى الشعبة" });
      }

      res.json({ success: true, message: "تمت الإضافة" });
    });
  });
});

// حذف طالب من شعبة
app.delete("/relations/section-students/:sectionId/:naturalId/:semesterId", (req, res) => {
  const { sectionId, naturalId, semesterId } = req.params;

  const sql = `
    DELETE FROM Section_Students
    WHERE SectionID = ? AND NaturalID = ? AND SemesterID = ?
  `;

  db.query(sql, [sectionId, naturalId, semesterId], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في حذف الطالب من الشعبة" });
    }

    res.json({ success: true, message: "تم الحذف" });
  });
});

// جلب ربط المعلمين بالمواد والشعب
app.get("/relations/subject-teachers/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT
      rte.SectionID,
      rte.SubjectID,
      rte.NaturalID,
      rte.SemesterID,
      s.SectionName,
      c.ClassName,
      sub.SubjectName,
      e.FullName AS TeacherName
    FROM Section_Subject_Employees rte
    JOIN Sections s
      ON rte.SectionID = s.SectionID
    JOIN Classes c
      ON s.ClassID = c.ClassID
    JOIN Subjects sub
      ON rte.SubjectID = sub.SubjectID
    JOIN Employees e
      ON rte.NaturalID = e.NaturalID
      AND rte.SemesterID = e.SemesterID
    WHERE rte.SemesterID = ?
    ORDER BY c.ClassName, s.SectionName, sub.SubjectName
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب ربط المعلمين" });
    }

    res.json(result);
  });
});

// إضافة معلم للمادة والشعبة
app.post("/relations/subject-teachers", (req, res) => {
  const { sectionId, subjectId, naturalId, semesterId } = req.body;

  if (!sectionId || !subjectId || !naturalId || !semesterId) {
    return res.status(400).json({ error: "البيانات المطلوبة ناقصة" });
  }

  // التحقق إذا نفس المادة في نفس الشعبة لها معلم مسبقاً
  const checkSql = `
    SELECT
      rte.NaturalID,
      e.FullName
    FROM Section_Subject_Employees rte
    JOIN Employees e
      ON rte.NaturalID = e.NaturalID
      AND rte.SemesterID = e.SemesterID
    WHERE rte.SectionID = ? AND rte.SubjectID = ? AND rte.SemesterID = ?
    LIMIT 1
  `;

  db.query(checkSql, [sectionId, subjectId, semesterId], (checkErr, checkResult) => {
    if (checkErr) {
      console.log(checkErr);
      return res.status(500).json({ error: "خطأ في التحقق من ربط المعلم" });
    }

    if (checkResult.length > 0) {
      return res.status(400).json({
        error: `هذه المادة مرتبطة مسبقاً بالمعلم ${checkResult[0].FullName}`
      });
    }

    const insertSql = `
      INSERT INTO Section_Subject_Employees (SectionID, SubjectID, SemesterID, NaturalID)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertSql, [sectionId, subjectId, semesterId, naturalId], (insertErr) => {
      if (insertErr) {
        console.log(insertErr);

        if (insertErr.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ error: "هذا الربط موجود مسبقاً" });
        }

        return res.status(500).json({ error: "خطأ في إضافة المعلم للمادة" });
      }

      res.json({ success: true, message: "تمت الإضافة" });
    });
  });
});

// حذف معلم من المادة والشعبة
app.delete("/relations/subject-teachers/:sectionId/:subjectId/:naturalId/:semesterId", (req, res) => {
  const { sectionId, subjectId, naturalId, semesterId } = req.params;

  const sql = `
    DELETE FROM Section_Subject_Employees
    WHERE SectionID = ? AND SubjectID = ? AND NaturalID = ? AND SemesterID = ?
  `;

  db.query(sql, [sectionId, subjectId, naturalId, semesterId], (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في حذف الربط" });
    }

    res.json({ success: true, message: "تم الحذف" });
  });
});
// ===============================
// Teacher Subjects API
// ===============================
app.get("/teacher/subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      sse.SectionID,
      sse.SubjectID,
      sub.SubjectName,
      sec.SectionName,
      c.ClassID,
      c.ClassName,
      (
        SELECT COUNT(*)
        FROM Section_Students ss
        WHERE ss.SectionID = sse.SectionID
          AND ss.SemesterID = sse.SemesterID
      ) AS StudentsCount
    FROM Section_Subject_Employees sse
    JOIN Subjects sub
      ON sse.SubjectID = sub.SubjectID
      AND sse.SemesterID = sub.SemesterID
    JOIN Sections sec
      ON sse.SectionID = sec.SectionID
      AND sse.SemesterID = sec.SemesterID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
      AND sec.SemesterID = c.SemesterID
    WHERE sse.NaturalID = ? AND sse.SemesterID = ?
    ORDER BY c.ClassID ASC, sec.SectionName ASC, sub.SubjectName ASC
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب مواد المعلم" });
    }

    res.json(result);
  });
});
// ===============================
// Teacher Class Management API
// ===============================
app.get("/teacher/class-info/:sectionId/:subjectId/:semesterId", (req, res) => {
  const { sectionId, subjectId, semesterId } = req.params;

  const sql = `
    SELECT
      sec.SectionID,
      sec.SectionName,
      sub.SubjectID,
      sub.SubjectName,
      c.ClassID,
      c.ClassName,
      sem.SemesterName
    FROM Sections sec
    JOIN Classes c ON sec.ClassID = c.ClassID
    JOIN Subjects sub ON sub.SubjectID = ?
    JOIN Semesters sem ON sem.SemesterID = sec.SemesterID
    WHERE sec.SectionID = ? AND sec.SemesterID = ? AND sub.SemesterID = ?
  `;

  db.query(sql, [subjectId, sectionId, semesterId, semesterId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "خطأ في جلب بيانات الصف" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "لم يتم العثور على البيانات" });
    }

    res.json(result[0]);
  });
});
// bulk insert periods
app.post("/periods/bulk", async (req, res) => {
  const { semesterId, periods } = req.body;

  if (!semesterId || !Array.isArray(periods) || periods.length === 0) {
    return res.status(400).json({ error: "semesterId و periods مطلوبين" });
  }

  try {
    const promiseDb = db.promise();
    const inserted = [];
    const skipped = [];

    for (const item of periods) {
      const { sectionId, subjectId, day, periodNumber } = item;

      if (!sectionId || !subjectId || !day || !periodNumber) {
        skipped.push({ ...item, reason: "بيانات ناقصة" });
        continue;
      }

      const [exists] = await promiseDb.query(
        `
        SELECT * FROM Periods
        WHERE SectionID = ? AND SemesterID = ? AND DayOfWeek = ? AND PeriodNumber = ?
        `,
        [sectionId, semesterId, day, periodNumber]
      );

      if (exists.length > 0) {
        skipped.push({ ...item, reason: "مكرر" });
        continue;
      }

      await promiseDb.query(
        `
        INSERT INTO Periods (SectionID, SubjectID, SemesterID, DayOfWeek, PeriodNumber)
        VALUES (?, ?, ?, ?, ?)
        `,
        [sectionId, subjectId, semesterId, day, periodNumber]
      );

      inserted.push(item);
    }

    res.json({
      success: true,
      message: "تمت معالجة الحصص",
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      skipped
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: "فشل إضافة الحصص",
      details: err.message
    });
  }
});
// اضافة طلاب 
app.post("/students/bulk", async (req, res) => {
  const { semesterId, students } = req.body;

  if (!semesterId || !Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ error: "semesterId و students مطلوبين" });
  }

  try {
    const promiseDb = db.promise();
    const inserted = [];
    const skipped = [];

    for (const student of students) {
      const {
        naturalId,
        fullName,
        birthDate,
        address,
        guardianPhone,
        enrollmentDate
      } = student;

      if (!naturalId || !fullName) {
        skipped.push({ naturalId, fullName, reason: "بيانات ناقصة" });
        continue;
      }

      const [existingUsers] = await promiseDb.query(
        `SELECT * FROM Users WHERE NaturalID = ? AND SemesterID = ?`,
        [naturalId, semesterId]
      );

      if (existingUsers.length > 0) {
        skipped.push({ naturalId, fullName, reason: "موجود مسبقاً" });
        continue;
      }

      await promiseDb.query(
        `
        INSERT INTO Users (NaturalID, SemesterID, Password, Type)
        VALUES (?, ?, ?, 'student')
        `,
        [naturalId, semesterId, naturalId]
      );

      await promiseDb.query(
        `
        INSERT INTO Students (NaturalID, SemesterID, FullName, BirthDate, Address, GuardianPhone, EnrollmentDate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          naturalId,
          semesterId,
          fullName,
          birthDate || null,
          address || null,
          guardianPhone || null,
          enrollmentDate || null
        ]
      );

      inserted.push({ naturalId, fullName });
    }

    res.json({
      success: true,
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      inserted,
      skipped
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "فشل إضافة الطلاب",
      details: err.message
    });
  }
});
app.post("/relations/section-students/bulk", async (req, res) => {
  const { semesterId, relations } = req.body;

  if (!semesterId || !Array.isArray(relations) || relations.length === 0) {
    return res.status(400).json({ error: "semesterId و relations مطلوبين" });
  }

  try {
    const promiseDb = db.promise();
    const inserted = [];
    const skipped = [];

    for (const item of relations) {
      const { sectionId, naturalId } = item;

      if (!sectionId || !naturalId) {
        skipped.push({ ...item, reason: "بيانات ناقصة" });
        continue;
      }

      const [existing] = await promiseDb.query(
        `
        SELECT *
        FROM Section_Students
        WHERE SectionID = ? AND NaturalID = ? AND SemesterID = ?
        `,
        [sectionId, naturalId, semesterId]
      );

      if (existing.length > 0) {
        skipped.push({ ...item, reason: "موجود مسبقاً" });
        continue;
      }

      await promiseDb.query(
        `
        INSERT INTO Section_Students (SectionID, NaturalID, SemesterID)
        VALUES (?, ?, ?)
        `,
        [sectionId, naturalId, semesterId]
      );

      inserted.push({ sectionId, naturalId });
    }

    res.json({
      success: true,
      insertedCount: inserted.length,
      skippedCount: skipped.length,
      inserted,
      skipped
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "فشل ربط الطلاب بالشعب",
      details: err.message
    });
  }
});
//حضور وغياب 
// حضور وغياب

app.get("/teacher/students/:sectionId/:semesterId", (req, res) => {
  const { sectionId, semesterId } = req.params;

  const sql = `
    SELECT 
      st.NaturalID,
      st.FullName,
      st.GuardianPhone
    FROM Section_Students ss
    JOIN Students st
      ON ss.NaturalID = st.NaturalID
      AND ss.SemesterID = st.SemesterID
    WHERE ss.SectionID = ? AND ss.SemesterID = ?
    ORDER BY st.FullName ASC
  `;

  db.query(sql, [sectionId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER STUDENTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل الطلاب" });
    }

    res.json(result);
  });
});

app.get("/teacher/attendance/periods", (req, res) => {
  const { sectionId, subjectId, semesterId, dayOfWeek } = req.query;

  if (!sectionId || !subjectId || !semesterId || !dayOfWeek) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT PeriodID, PeriodNumber
    FROM Periods
    WHERE SectionID = ? AND SubjectID = ? AND SemesterID = ? AND DayOfWeek = ?
    ORDER BY PeriodNumber ASC
  `;

  db.query(sql, [sectionId, subjectId, semesterId, dayOfWeek], (err, result) => {
    if (err) {
      console.log("ATTENDANCE PERIODS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل حصص اليوم" });
    }

    res.json(result);
  });
});

app.get("/teacher/attendance/check", (req, res) => {
  const { sectionId, subjectId, semesterId, periodId, date } = req.query;

  if (!sectionId || !subjectId || !semesterId || !periodId || !date) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT AttendanceID
    FROM Attendance
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND PeriodID = ?
      AND AttendanceDate = ?
    LIMIT 1
  `;

  db.query(sql, [sectionId, subjectId, semesterId, periodId, date], (err, result) => {
    if (err) {
      console.log("ATTENDANCE CHECK ERROR:", err);
      return res.status(500).json({ error: "فشل التحقق من سجل الحضور" });
    }

    res.json({ exists: result.length > 0 });
  });
});

app.post("/teacher/attendance", (req, res) => {
  const { sectionId, subjectId, semesterId, periodId, attendanceDate, records } = req.body;

  if (!sectionId || !subjectId || !semesterId || !periodId || !attendanceDate || !Array.isArray(records)) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const values = records.map((record) => [
    Number(sectionId),
    Number(subjectId),
    Number(semesterId),
    record.naturalId,
    Number(periodId),
    attendanceDate,
    Number(record.status)
  ]);

  const sql = `
    INSERT INTO Attendance
    (SectionID, SubjectID, SemesterID, NaturalID, PeriodID, AttendanceDate, Status)
    VALUES ?
  `;

  db.query(sql, [values], (err) => {
    if (err) {
      console.log("ATTENDANCE SAVE ERROR:", err);
      return res.status(500).json({
        error: "فشل حفظ الحضور",
        details: err.sqlMessage || err.message
      });
    }

    res.json({ success: true, message: "تم حفظ الحضور بنجاح" });
  });
});
app.get("/teacher/attendance/existing", (req, res) => {
  const { sectionId, subjectId, semesterId, periodId, date } = req.query;

  if (!sectionId || !subjectId || !semesterId || !periodId || !date) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT 
      NaturalID,
      IF(Status = b'1', 1, 0) AS Status
    FROM Attendance
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND PeriodID = ?
      AND AttendanceDate = ?
  `;

  db.query(sql, [sectionId, subjectId, semesterId, periodId, date], (err, result) => {
    if (err) {
      console.log("ATTENDANCE EXISTING ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل سجل الحضور" });
    }

    console.log("EXISTING ATTENDANCE:", result);
    res.json(result);
  });
});
app.put("/teacher/attendance", (req, res) => {
  const { sectionId, subjectId, semesterId, periodId, attendanceDate, records } = req.body;

  if (!sectionId || !subjectId || !semesterId || !periodId || !attendanceDate || !Array.isArray(records)) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const deleteSql = `
    DELETE FROM Attendance
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND PeriodID = ?
      AND AttendanceDate = ?
  `;

  db.query(
    deleteSql,
    [sectionId, subjectId, semesterId, periodId, attendanceDate],
    (deleteErr) => {
      if (deleteErr) {
        console.log("ATTENDANCE DELETE BEFORE UPDATE ERROR:", deleteErr);
        return res.status(500).json({ error: "فشل تعديل سجل الحضور" });
      }

      const values = records.map((record) => [
        Number(sectionId),
        Number(subjectId),
        Number(semesterId),
        record.naturalId,
        Number(periodId),
        attendanceDate,
        Number(record.status)
      ]);

      const insertSql = `
        INSERT INTO Attendance
        (SectionID, SubjectID, SemesterID, NaturalID, PeriodID, AttendanceDate, Status)
        VALUES ?
      `;

      db.query(insertSql, [values], (insertErr) => {
        if (insertErr) {
          console.log("ATTENDANCE UPDATE INSERT ERROR:", insertErr);
          return res.status(500).json({
            error: "فشل تعديل سجل الحضور",
            details: insertErr.sqlMessage || insertErr.message
          });
        }

        res.json({ success: true, message: "تم تعديل سجل الحضور بنجاح" });
      });
    }
  );
});
// tasks
app.get("/teacher/tasks/:sectionId/:subjectId/:semesterId", (req, res) => {
  const { sectionId, subjectId, semesterId } = req.params;

  const sql = `
  SELECT 
    TaskID,
    TaskInfo,
    DATE_FORMAT(TaskDate, '%Y-%m-%d') AS TaskDate,
    DATE_FORMAT(CreatedAt, '%Y-%m-%d') AS CreatedAt
  FROM Tasks
  WHERE SectionID = ? AND SubjectID = ? AND SemesterID = ?
  ORDER BY CreatedAt DESC, TaskID DESC
`;

  db.query(sql, [sectionId, subjectId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER TASKS GET ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل المهام" });
    }

    res.json(result);
  });
});

app.post("/teacher/tasks", (req, res) => {
  const { sectionId, subjectId, semesterId, taskInfo, taskDate } = req.body;

  if (!sectionId || !subjectId || !semesterId || !taskInfo || !taskDate) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    INSERT INTO Tasks (SectionID, SubjectID, SemesterID, TaskInfo, TaskDate)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [sectionId, subjectId, semesterId, taskInfo, taskDate], (err, result) => {
    if (err) {
      console.log("TEACHER TASKS POST ERROR:", err);
      return res.status(500).json({
        error: "فشل إضافة المهمة",
        details: err.sqlMessage || err.message
      });
    }

    res.json({ success: true, message: "تمت إضافة المهمة بنجاح" });
  });
});

app.delete("/teacher/tasks/:taskId", (req, res) => {
  const { taskId } = req.params;

  const sql = `
    DELETE FROM Tasks
    WHERE TaskID = ?
  `;

  db.query(sql, [taskId], (err, result) => {
    if (err) {
      console.log("TEACHER TASKS DELETE ERROR:", err);
      return res.status(500).json({ error: "فشل حذف المهمة" });
    }

    res.json({ success: true, message: "تم حذف المهمة بنجاح" });
  });
});
// grades
app.get("/teacher/grades/types/:semesterId", (req, res) => {
  const { semesterId } = req.params;

  const sql = `
    SELECT 
      gs.SchemeID,
      gs.MaxGrade,
      gt.GradeTypeID,
      gt.GradeTypeName
    FROM Grade_Scheme gs
    JOIN Grade_Type gt ON gs.GradeTypeID = gt.GradeTypeID
    WHERE gs.SemesterID = ?
    ORDER BY gt.GradeTypeID ASC
  `;

  db.query(sql, [semesterId], (err, result) => {
    if (err) {
      console.log("GRADE TYPES ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل أنواع العلامات" });
    }

    res.json(result);
  });
});

app.get("/teacher/grades/students/:sectionId/:semesterId", (req, res) => {
  const { sectionId, semesterId } = req.params;

  const sql = `
    SELECT 
      st.NaturalID,
      st.FullName
    FROM Section_Students ss
    JOIN Students st
      ON ss.NaturalID = st.NaturalID
      AND ss.SemesterID = st.SemesterID
    WHERE ss.SectionID = ? AND ss.SemesterID = ?
    ORDER BY st.FullName ASC
  `;

  db.query(sql, [sectionId, semesterId], (err, result) => {
    if (err) {
      console.log("GRADE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل الطلاب" });
    }

    res.json(result);
  });
});

app.get("/teacher/grades/existing", (req, res) => {
  const { sectionId, subjectId, semesterId, schemeId } = req.query;

  if (!sectionId || !subjectId || !semesterId || !schemeId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT NaturalID, GradeValue
    FROM Grades
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND SchemeID = ?
  `;

  db.query(sql, [sectionId, subjectId, semesterId, schemeId], (err, result) => {
    if (err) {
      console.log("EXISTING GRADES ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل العلامات السابقة" });
    }

    res.json(result);
  });
});

app.post("/teacher/grades", (req, res) => {
  const { sectionId, subjectId, semesterId, schemeId, grades } = req.body;

  if (!sectionId || !subjectId || !semesterId || !schemeId || !Array.isArray(grades)) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const values = grades.map((grade) => [
    Number(sectionId),
    Number(subjectId),
    Number(semesterId),
    grade.naturalId,
    Number(schemeId),
    grade.value
  ]);

  const sql = `
    INSERT INTO Grades
    (SectionID, SubjectID, SemesterID, NaturalID, SchemeID, GradeValue)
    VALUES ?
  `;

  db.query(sql, [values], (err) => {
    if (err) {
      console.log("SAVE GRADES ERROR:", err);
      return res.status(500).json({
        error: "فشل حفظ العلامات",
        details: err.sqlMessage || err.message
      });
    }

    res.json({ success: true, message: "تم حفظ العلامات بنجاح" });
  });
});

app.put("/teacher/grades", (req, res) => {
  const { sectionId, subjectId, semesterId, schemeId, grades } = req.body;

  if (!sectionId || !subjectId || !semesterId || !schemeId || !Array.isArray(grades)) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const deleteSql = `
    DELETE FROM Grades
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND SchemeID = ?
  `;

  db.query(deleteSql, [sectionId, subjectId, semesterId, schemeId], (deleteErr) => {
    if (deleteErr) {
      console.log("DELETE OLD GRADES ERROR:", deleteErr);
      return res.status(500).json({ error: "فشل تعديل العلامات" });
    }

    const values = grades.map((grade) => [
      Number(sectionId),
      Number(subjectId),
      Number(semesterId),
      grade.naturalId,
      Number(schemeId),
      grade.value
    ]);

    const insertSql = `
      INSERT INTO Grades
      (SectionID, SubjectID, SemesterID, NaturalID, SchemeID, GradeValue)
      VALUES ?
    `;

    db.query(insertSql, [values], (insertErr) => {
      if (insertErr) {
        console.log("INSERT UPDATED GRADES ERROR:", insertErr);
        return res.status(500).json({
          error: "فشل تعديل العلامات",
          details: insertErr.sqlMessage || insertErr.message
        });
      }

      res.json({ success: true, message: "تم تعديل العلامات بنجاح" });
    });
  });
});
// book upload
app.get("/teacher/book/:subjectId/:semesterId", (req, res) => {
  const { subjectId, semesterId } = req.params;

  const sql = `
    SELECT SubjectID, SubjectName, BookPath
    FROM Subjects
    WHERE SubjectID = ? AND SemesterID = ?
  `;

  db.query(sql, [subjectId, semesterId], (err, result) => {
    if (err) {
      console.log("BOOK GET ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل بيانات الكتاب" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "لم يتم العثور على المادة" });
    }

    res.json(result[0]);
  });
});

app.post("/teacher/book-upload", uploadBook.single("book"), (req, res) => {
  const { subjectId, semesterId } = req.body;

  if (!subjectId || !semesterId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "لم يتم اختيار ملف" });
  }

  const bookPath = `/uploads/books/${req.file.filename}`;

  const sql = `
    UPDATE Subjects
    SET BookPath = ?
    WHERE SubjectID = ? AND SemesterID = ?
  `;

  db.query(sql, [bookPath, subjectId, semesterId], (err) => {
    if (err) {
      console.log("BOOK UPLOAD ERROR:", err);
      return res.status(500).json({
        error: "فشل حفظ مسار الكتاب",
        details: err.sqlMessage || err.message
      });
    }

    res.json({
      success: true,
      message: "تم رفع الكتاب بنجاح",
      bookPath,
      fileName: req.file.filename,
      size: req.file.size
    });
  });
});

app.delete("/teacher/book/:subjectId/:semesterId", (req, res) => {
  const { subjectId, semesterId } = req.params;

  const selectSql = `
    SELECT BookPath
    FROM Subjects
    WHERE SubjectID = ? AND SemesterID = ?
  `;

  db.query(selectSql, [subjectId, semesterId], (selectErr, result) => {
    if (selectErr) {
      console.log("BOOK SELECT DELETE ERROR:", selectErr);
      return res.status(500).json({ error: "فشل تحميل بيانات الكتاب" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "المادة غير موجودة" });
    }

    const currentBookPath = result[0].BookPath;

    const updateSql = `
      UPDATE Subjects
      SET BookPath = NULL
      WHERE SubjectID = ? AND SemesterID = ?
    `;

    db.query(updateSql, [subjectId, semesterId], (updateErr) => {
      if (updateErr) {
        console.log("BOOK DELETE UPDATE ERROR:", updateErr);
        return res.status(500).json({ error: "فشل حذف الكتاب" });
      }

      if (currentBookPath) {
        const fullFilePath = path.join(
          __dirname,
          currentBookPath.replace(/^\/+/, "")
        );

        fs.unlink(fullFilePath, (unlinkErr) => {
          if (unlinkErr) {
            console.log("BOOK FILE DELETE WARNING:", unlinkErr.message);
          }
        });
      }

      res.json({ success: true, message: "تم حذف الكتاب بنجاح" });
    });
  });
});
// ===============================
// Teacher Messages API
// ===============================

// جلب مواد/شعب المعلم للرسائل
app.get("/teacher/messages/subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      sse.SectionID,
      sse.SubjectID,
      sub.SubjectName,
      sec.SectionName,
      c.ClassName
    FROM Section_Subject_Employees sse
    JOIN Subjects sub
      ON sse.SubjectID = sub.SubjectID
    JOIN Sections sec
      ON sse.SectionID = sec.SectionID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
    WHERE sse.NaturalID = ?
      AND sse.SemesterID = ?
    ORDER BY c.ClassID, sec.SectionName, sub.SubjectName
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE SUBJECTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل مواد المعلم" });
    }

    res.json(result);
  });
});

// جلب عدد الرسائل غير المقروءة الكلي للمعلم (للداشبورد)
app.get("/teacher/messages/unread-count/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT COUNT(*) AS UnreadCount
    FROM Messages
    WHERE ReceiverID = ?
      AND SemesterID = ?
      AND IsRead = 0
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE UNREAD COUNT ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل عدد الرسائل غير المقروءة" });
    }

    res.json(result[0]);
  });
});

// جلب عدد الرسائل غير المقروءة لكل مادة/شعبة عند المعلم
app.get("/teacher/messages/unread-subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      m.SectionID,
      m.SubjectID,
      COUNT(*) AS UnreadCount
    FROM Messages m
    WHERE m.ReceiverID = ?
      AND m.SemesterID = ?
      AND m.IsRead = 0
    GROUP BY m.SectionID, m.SubjectID
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE UNREAD SUBJECTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل إشعارات المواد" });
    }

    res.json(result);
  });
});

// جلب طلاب الشعبة للرسائل
app.get("/teacher/messages/students/:sectionId/:semesterId", (req, res) => {
  const { sectionId, semesterId } = req.params;

  const sql = `
    SELECT 
      st.NaturalID,
      st.FullName
    FROM Section_Students ss
    JOIN Students st
      ON ss.NaturalID = st.NaturalID
      AND ss.SemesterID = st.SemesterID
    WHERE ss.SectionID = ?
      AND ss.SemesterID = ?
    ORDER BY st.FullName ASC
  `;

  db.query(sql, [sectionId, semesterId], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE STUDENTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل الطلاب" });
    }

    res.json(result);
  });
});

// جلب عدد الرسائل غير المقروءة لكل طالب داخل مادة/شعبة معينة
app.get("/teacher/messages/unread-students", (req, res) => {
  const { sectionId, subjectId, semesterId, teacherId } = req.query;

  if (!sectionId || !subjectId || !semesterId || !teacherId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT
      m.SenderID AS NaturalID,
      COUNT(*) AS UnreadCount
    FROM Messages m
    WHERE m.SectionID = ?
      AND m.SubjectID = ?
      AND m.SemesterID = ?
      AND m.ReceiverID = ?
      AND m.IsRead = 0
    GROUP BY m.SenderID
  `;

  db.query(sql, [sectionId, subjectId, semesterId, teacherId], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE UNREAD STUDENTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل إشعارات الطلاب" });
    }

    res.json(result);
  });
});

// جلب المحادثة بين المعلم والطالب + تعليم الرسائل كمقروءة
app.get("/teacher/messages/chat", (req, res) => {
  const { sectionId, subjectId, semesterId, teacherId, studentId } = req.query;

  if (!sectionId || !subjectId || !semesterId || !teacherId || !studentId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const updateReadSql = `
    UPDATE Messages
    SET IsRead = 1,
        ReadAt = NOW()
    WHERE SectionID = ?
      AND SubjectID = ?
      AND SemesterID = ?
      AND SenderID = ?
      AND ReceiverID = ?
      AND IsRead = 0
  `;

  db.query(
    updateReadSql,
    [sectionId, subjectId, semesterId, studentId, teacherId],
    (updateErr) => {
      if (updateErr) {
        console.log("TEACHER MESSAGE MARK READ ERROR:", updateErr);
        return res.status(500).json({ error: "فشل تحديث حالة القراءة" });
      }

      const sql = `
        SELECT
          m.MessageID,
          m.SenderID,
          m.ReceiverID,
          m.Body,
          m.IsRead,
          DATE_FORMAT(m.SentAt, '%Y-%m-%d %H:%i:%s') AS SentAt
        FROM Messages m
        WHERE m.SectionID = ?
          AND m.SubjectID = ?
          AND m.SemesterID = ?
          AND (
            (m.SenderID = ? AND m.ReceiverID = ?)
            OR
            (m.SenderID = ? AND m.ReceiverID = ?)
          )
        ORDER BY m.SentAt ASC, m.MessageID ASC
      `;

      db.query(
        sql,
        [sectionId, subjectId, semesterId, teacherId, studentId, studentId, teacherId],
        (err, result) => {
          if (err) {
            console.log("TEACHER MESSAGE CHAT ERROR:", err);
            return res.status(500).json({ error: "فشل تحميل المحادثة" });
          }

          res.json(result);
        }
      );
    }
  );
});

// إرسال رسالة من المعلم
app.post("/teacher/messages/send", (req, res) => {
  const { sectionId, subjectId, semesterId, senderId, receiverId, body } = req.body;

  if (!sectionId || !subjectId || !semesterId || !senderId || !receiverId || !body) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    INSERT INTO Messages (
      SectionID,
      SubjectID,
      SemesterID,
      SenderID,
      ReceiverID,
      Body,
      IsRead,
      ReadAt
    )
    VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
  `;

  db.query(sql, [sectionId, subjectId, semesterId, senderId, receiverId, body], (err, result) => {
    if (err) {
      console.log("TEACHER MESSAGE SEND ERROR:", err);
      return res.status(500).json({
        error: "فشل إرسال الرسالة",
        details: err.sqlMessage || err.message
      });
    }

    res.json({
      success: true,
      message: "تم إرسال الرسالة بنجاح",
      messageId: result.insertId
    });
  });
});
// ===============================
// Student Dashboard API
// ===============================
app.get("/student/dashboard/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      st.FullName,
      sem.SemesterName,
      c.ClassName,
      sec.SectionName
    FROM Students st
    JOIN Semesters sem
      ON st.SemesterID = sem.SemesterID
    LEFT JOIN Section_Students ss
      ON st.NaturalID = ss.NaturalID
      AND st.SemesterID = ss.SemesterID
    LEFT JOIN Sections sec
      ON ss.SectionID = sec.SectionID
      AND ss.SemesterID = sec.SemesterID
    LEFT JOIN Classes c
      ON sec.ClassID = c.ClassID
    WHERE st.NaturalID = ?
      AND st.SemesterID = ?
    LIMIT 1
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT DASHBOARD ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل بيانات الطالب" });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: "لم يتم العثور على بيانات الطالب" });
    }

    res.json(result[0]);
  });
});
// ===============================
// Student Subjects API
// ===============================
app.get("/student/subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      sub.SubjectID,
      sub.SubjectName,
      sub.BookPath,
      sub.IconId,
      c.ClassName,
      sec.SectionName
    FROM Section_Students ss
    JOIN Sections sec
      ON ss.SectionID = sec.SectionID
      AND ss.SemesterID = sec.SemesterID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
      AND sec.SemesterID = ss.SemesterID
    JOIN Subjects sub
      ON sub.ClassID = c.ClassID
      AND sub.SemesterID = ss.SemesterID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
    ORDER BY sub.SubjectName ASC
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT SUBJECTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل المواد" });
    }

    res.json(result);
  });
});
// ===============================
 // Student Schedule API
 // ===============================
app.get("/student/schedule/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      p.DayOfWeek,
      p.PeriodNumber,
      sub.SubjectName,
      c.ClassName,
      sec.SectionName,
      sem.SemesterName
    FROM Section_Students ss
    JOIN Sections sec
      ON ss.SectionID = sec.SectionID
      AND ss.SemesterID = sec.SemesterID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
    JOIN Semesters sem
      ON ss.SemesterID = sem.SemesterID
    JOIN Periods p
      ON p.SectionID = ss.SectionID
      AND p.SemesterID = ss.SemesterID
    JOIN Subjects sub
      ON p.SubjectID = sub.SubjectID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
    ORDER BY
      FIELD(p.DayOfWeek, 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'),
      p.PeriodNumber ASC
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT SCHEDULE ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل الجدول الدراسي" });
    }

    res.json(result);
  });
});
// ===============================
// Student Tasks API
// ===============================
app.get("/student/tasks/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      t.TaskID,
      t.TaskInfo,
      DATE_FORMAT(t.TaskDate, '%Y-%m-%d') AS TaskDate,
      DATE_FORMAT(t.CreatedAt, '%Y-%m-%d') AS CreatedAt,
      sub.SubjectName,
      c.ClassName,
      sec.SectionName
    FROM Section_Students ss
    JOIN Sections sec
      ON ss.SectionID = sec.SectionID
      AND ss.SemesterID = sec.SemesterID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
      AND sec.SemesterID = c.SemesterID
    JOIN Tasks t
      ON t.SectionID = ss.SectionID
      AND t.SemesterID = ss.SemesterID
    JOIN Subjects sub
      ON t.SubjectID = sub.SubjectID
      AND t.SemesterID = sub.SemesterID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
    ORDER BY
      CASE
        WHEN t.TaskDate < CURDATE() THEN 1
        ELSE 0
      END ASC,
      t.TaskDate ASC,
      t.TaskID DESC
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT TASKS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل الواجبات" });
    }

    res.json(result);
  });
});
// ===============================
// Student Grades API
// ===============================
app.get("/student/grades/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      sub.SubjectID,
      sub.SubjectName,
      gt.GradeTypeName,
      gs.MaxGrade,
      g.GradeValue,
      sem.SemesterName
    FROM Section_Students ss
    JOIN Periods p
      ON ss.SectionID = p.SectionID
      AND ss.SemesterID = p.SemesterID
    JOIN Subjects sub
      ON p.SubjectID = sub.SubjectID
    JOIN Semesters sem
      ON ss.SemesterID = sem.SemesterID
    CROSS JOIN Grade_Scheme gs
    JOIN Grade_Type gt
      ON gs.GradeTypeID = gt.GradeTypeID
    LEFT JOIN Grades g
      ON g.SubjectID = sub.SubjectID
      AND g.SectionID = ss.SectionID
      AND g.SemesterID = ss.SemesterID
      AND g.NaturalID = ss.NaturalID
      AND g.SchemeID = gs.SchemeID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
      AND gs.SemesterID = ?
    GROUP BY
      sub.SubjectID,
      sub.SubjectName,
      gt.GradeTypeName,
      gs.MaxGrade,
      g.GradeValue,
      sem.SemesterName,
      gt.GradeTypeID
    ORDER BY sub.SubjectName ASC, gt.GradeTypeID ASC
  `;

  db.query(sql, [naturalId, semesterId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT GRADES ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل العلامات" });
    }

    res.json(result);
  });
});
// ===============================
// Student Attendance API
// ===============================
app.get("/student/attendance/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      sub.SubjectID,
      sub.SubjectName,
      sem.SemesterName,
      a.AttendanceDate,
      IF(a.Status = b'1', 1, 0) AS Status,
      p.PeriodNumber
    FROM Section_Students ss
    JOIN Section_Subject_Employees sse
      ON ss.SectionID = sse.SectionID
      AND ss.SemesterID = sse.SemesterID
    JOIN Subjects sub
      ON sse.SubjectID = sub.SubjectID
    JOIN Semesters sem
      ON ss.SemesterID = sem.SemesterID
    LEFT JOIN Attendance a
      ON a.SectionID = ss.SectionID
      AND a.SubjectID = sse.SubjectID
      AND a.SemesterID = ss.SemesterID
      AND a.NaturalID = ss.NaturalID
    LEFT JOIN Periods p
      ON a.PeriodID = p.PeriodID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
    ORDER BY sub.SubjectName ASC, a.AttendanceDate DESC, p.PeriodNumber ASC
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT ATTENDANCE ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل سجل الحضور" });
    }

    res.json(result);
  });
});
// ===============================
// Student Messages API
// ===============================

// جلب مواد الطالب مع المعلم المرتبط بكل مادة
app.get("/student/messages/subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      ss.SectionID,
      sse.SubjectID,
      sub.SubjectName,
      sec.SectionName,
      c.ClassName,
      e.NaturalID AS TeacherID,
      e.FullName AS TeacherName
    FROM Section_Students ss
    JOIN Sections sec
      ON ss.SectionID = sec.SectionID
      AND ss.SemesterID = sec.SemesterID
    JOIN Classes c
      ON sec.ClassID = c.ClassID
    JOIN Section_Subject_Employees sse
      ON ss.SectionID = sse.SectionID
      AND ss.SemesterID = sse.SemesterID
    JOIN Subjects sub
      ON sse.SubjectID = sub.SubjectID
    JOIN Employees e
      ON sse.NaturalID = e.NaturalID
      AND sse.SemesterID = e.SemesterID
    WHERE ss.NaturalID = ?
      AND ss.SemesterID = ?
    ORDER BY c.ClassID, sub.SubjectName
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT MESSAGE SUBJECTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل مواد الطالب" });
    }

    res.json(result);
  });
});

// جلب المحادثة بين الطالب والمعلم + تعليم الرسائل كمقروءة
app.get("/student/messages/chat", (req, res) => {
  const { sectionId, subjectId, semesterId, teacherId, studentId } = req.query;

  if (!sectionId || !subjectId || !semesterId || !teacherId || !studentId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    SELECT
      m.MessageID,
      m.SenderID,
      m.ReceiverID,
      m.Body,
      DATE_FORMAT(m.SentAt, '%Y-%m-%d %H:%i:%s') AS SentAt
    FROM Messages m
    WHERE m.SectionID = ?
      AND m.SubjectID = ?
      AND m.SemesterID = ?
      AND (
        (m.SenderID = ? AND m.ReceiverID = ?)
        OR
        (m.SenderID = ? AND m.ReceiverID = ?)
      )
    ORDER BY m.SentAt ASC, m.MessageID ASC
  `;

  db.query(
    sql,
    [sectionId, subjectId, semesterId, teacherId, studentId, studentId, teacherId],
    (err, result) => {
      if (err) {
        console.log("STUDENT MESSAGE CHAT ERROR:", err);
        return res.status(500).json({ error: "فشل تحميل المحادثة" });
      }

      const markReadSql = `
        UPDATE Messages
        SET IsRead = 1
        WHERE SectionID = ?
          AND SubjectID = ?
          AND SemesterID = ?
          AND SenderID = ?
          AND ReceiverID = ?
          AND IsRead = 0
      `;

      db.query(
        markReadSql,
        [sectionId, subjectId, semesterId, teacherId, studentId],
        (updateErr) => {
          if (updateErr) {
            console.log("STUDENT MESSAGE MARK READ ERROR:", updateErr);
          }

          res.json(result);
        }
      );
    }
  );
});
// إرسال رسالة من الطالب إلى المعلم
app.post("/student/messages/send", (req, res) => {
  const { sectionId, subjectId, semesterId, senderId, receiverId, body } = req.body;

  if (!sectionId || !subjectId || !semesterId || !senderId || !receiverId || !body) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const sql = `
    INSERT INTO Messages (SectionID, SubjectID, SemesterID, SenderID, ReceiverID, Body)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [sectionId, subjectId, semesterId, senderId, receiverId, body], (err, result) => {
    if (err) {
      console.log("STUDENT MESSAGE SEND ERROR:", err);
      return res.status(500).json({
        error: "فشل إرسال الرسالة",
        details: err.sqlMessage || err.message
      });
    }

    res.json({
      success: true,
      message: "تم إرسال الرسالة بنجاح",
      messageId: result.insertId
    });
  });
});
// عدد الرسائل غير المقروءة لكل مادة عند الطالب
app.get("/student/messages/unread-subjects/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT
      m.SectionID,
      m.SubjectID,
      COUNT(*) AS UnreadCount
    FROM Messages m
    WHERE m.ReceiverID = ?
      AND m.SemesterID = ?
      AND m.IsRead = 0
    GROUP BY m.SectionID, m.SubjectID
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT MESSAGE UNREAD SUBJECTS ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل عدد الرسائل غير المقروءة" });
    }

    res.json(result);
  });
});
// العدد الكلي للرسائل غير المقروءة عند الطالب
app.get("/student/messages/unread-count/:naturalId/:semesterId", (req, res) => {
  const { naturalId, semesterId } = req.params;

  const sql = `
    SELECT COUNT(*) AS UnreadCount
    FROM Messages
    WHERE ReceiverID = ?
      AND SemesterID = ?
      AND IsRead = 0
  `;

  db.query(sql, [naturalId, semesterId], (err, result) => {
    if (err) {
      console.log("STUDENT MESSAGE UNREAD COUNT ERROR:", err);
      return res.status(500).json({ error: "فشل تحميل عدد الرسائل غير المقروءة" });
    }

    res.json({
      unreadCount: Number(result[0]?.UnreadCount || 0),
    });
  });
});
// تعديل رسالة
app.put("/messages/:messageId", (req, res) => {
  const { messageId } = req.params;
  const { senderId, body } = req.body;

  if (!messageId || !senderId || !body) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const checkSql = `
    SELECT MessageID, SenderID
    FROM Messages
    WHERE MessageID = ?
  `;

  db.query(checkSql, [messageId], (checkErr, checkResult) => {
    if (checkErr) {
      console.log("MESSAGE CHECK ERROR:", checkErr);
      return res.status(500).json({ error: "فشل التحقق من الرسالة" });
    }

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "الرسالة غير موجودة" });
    }

    if (checkResult[0].SenderID !== senderId) {
      return res.status(403).json({ error: "غير مسموح لك تعديل هذه الرسالة" });
    }

    const updateSql = `
      UPDATE Messages
      SET Body = ?
      WHERE MessageID = ?
    `;

    db.query(updateSql, [body, messageId], (updateErr) => {
      if (updateErr) {
        console.log("MESSAGE UPDATE ERROR:", updateErr);
        return res.status(500).json({ error: "فشل تعديل الرسالة" });
      }

      res.json({
        success: true,
        message: "تم تعديل الرسالة بنجاح"
      });
    });
  });
});
// حذف رسالة
app.delete("/messages/:messageId", (req, res) => {
  const { messageId } = req.params;
  const { senderId } = req.body;

  if (!messageId || !senderId) {
    return res.status(400).json({ error: "البيانات ناقصة" });
  }

  const checkSql = `
    SELECT MessageID, SenderID
    FROM Messages
    WHERE MessageID = ?
  `;

  db.query(checkSql, [messageId], (checkErr, checkResult) => {
    if (checkErr) {
      console.log("MESSAGE CHECK DELETE ERROR:", checkErr);
      return res.status(500).json({ error: "فشل التحقق من الرسالة" });
    }

    if (checkResult.length === 0) {
      return res.status(404).json({ error: "الرسالة غير موجودة" });
    }

    if (checkResult[0].SenderID !== senderId) {
      return res.status(403).json({ error: "غير مسموح لك حذف هذه الرسالة" });
    }

    const deleteSql = `
      DELETE FROM Messages
      WHERE MessageID = ?
    `;

    db.query(deleteSql, [messageId], (deleteErr) => {
      if (deleteErr) {
        console.log("MESSAGE DELETE ERROR:", deleteErr);
        return res.status(500).json({ error: "فشل حذف الرسالة" });
      }

      res.json({
        success: true,
        message: "تم حذف الرسالة بنجاح"
      });
    });
  });
});

// ===============================
// Start Server
// ===============================
app.listen(3000, () => {
  console.log("Server running on port 3000 🚀");
});