/**
 * Golden-sample subsystem decomposition for the CSMA PRD (L-tier, domain-based).
 *
 * This is the validated reference decomposition (9 business domains) used to:
 *   - unit-test the manifest validator + build-order derivation,
 *   - serve as a few-shot example for the Phase-0 decomposer.
 *
 * Endpoints are a representative (not exhaustive) slice of §26; the point is a
 * faithful, exclusive ownership map. Cross-domain reads (e.g. billing's payroll
 * export reading scheduling's financeTeacherHours) are allowed at the shared
 * global data layer; ownership names the WRITER/primary API of each collection.
 */

import type { SubsystemManifest } from "./types";
import { SUBSYSTEM_MANIFEST_VERSION } from "./types";

export const CSMA_SUBSYSTEM_MANIFEST: SubsystemManifest = {
  version: SUBSYSTEM_MANIFEST_VERSION,
  tier: "L",
  notes: [
    "Data layer is built globally in Phase 1; subsystems do not create tables.",
    "admin-ops reports aggregate enrollment/scheduling/billing data via the frozen contract — a soft (test-time) dependency, not a build dependency.",
    "financeTeacherHours is owned (written) by scheduling; billing's payroll export reads it.",
  ],
  subsystems: [
    {
      id: "auth-accounts",
      name: "认证与账户",
      description: "登录注册、Google OAuth、政策签署、家庭/员工档案、账户生命周期、管理员用户管理。",
      ownedRoutes: ["/auth", "/family/agreements", "/family/profile", "/teacher/profile", "/admin/profile", "/admin/users", "/admin/users/:userId"],
      ownedApiEndpoints: [
        "POST /api/v1/auth/register", "POST /api/v1/auth/login", "POST /api/v1/auth/google",
        "POST /api/v1/auth/logout", "DELETE /api/v1/auth/account", "GET /api/v1/auth/session",
        "GET /api/v1/policies/current", "POST /api/v1/policies/sign", "GET /api/v1/policies/status",
        "GET /api/v1/family/profile", "PUT /api/v1/family/profile", "POST /api/v1/family/children",
        "GET /api/v1/admin/users", "POST /api/v1/admin/users/:userId/lock",
      ],
      ownedCollections: ["familyProfiles", "familyAccount", "adminUsers", "adminUserDetailMap"],
      ownedModules: ["backend/src/api/modules/auth", "backend/src/api/modules/policies", "backend/src/api/modules/accounts"],
      dependsOn: [],
      prdSections: ["§9", "§6.2", "§15.1", "§15.9", "§15.10", "§10.12", "§12.3", "§12.4"],
    },
    {
      id: "catalog",
      name: "课程与教师目录",
      description: "课程/教师目录浏览、课程管理与编辑器、班级、媒体上传。",
      ownedRoutes: ["/family/courses", "/family/teachers", "/admin/courses", "/admin/courses/new", "/admin/courses/:courseId/edit"],
      ownedApiEndpoints: [
        "GET /api/v1/courses", "GET /api/v1/courses/:courseId", "GET /api/v1/courses/:courseId/classes",
        "GET /api/v1/teachers", "GET /api/v1/teachers/:teacherId", "GET /api/v1/teachers/:teacherId/available-slots",
        "GET /api/v1/admin/courses", "POST /api/v1/admin/courses", "PUT /api/v1/admin/courses/:courseId",
        "POST /api/v1/admin/courses/media", "POST /api/v1/upload",
      ],
      ownedCollections: ["courses", "teachers", "groupClasses", "adminCourses"],
      ownedModules: ["backend/src/api/modules/courses", "backend/src/api/modules/teachers"],
      dependsOn: ["auth-accounts"],
      prdSections: ["§10.2", "§10.3", "§12.5", "§12.6", "§15.11"],
    },
    {
      id: "enrollment",
      name: "报名与候补",
      description: "四类课程报名、购物车、候补、管理员报名管理与候补转正。",
      ownedRoutes: ["/family/courses/private/:courseId", "/family/courses/group/:courseId", "/family/courses/lecture/:courseId", "/family/courses/camp/:courseId", "/family/cart", "/admin/enrollments"],
      ownedApiEndpoints: [
        "POST /api/v1/enrollments/private", "POST /api/v1/enrollments/group", "POST /api/v1/enrollments/lecture", "POST /api/v1/enrollments/camp",
        "GET /api/v1/cart", "POST /api/v1/cart", "DELETE /api/v1/cart/:itemId", "POST /api/v1/cart/checkout",
        "GET /api/v1/admin/enrollments", "POST /api/v1/admin/enrollments/:id/convert-waitlist", "POST /api/v1/admin/enrollments/:id/cancel",
      ],
      ownedCollections: ["registrationRecords", "adminEnrollments", "orderMockSchema"],
      ownedModules: ["backend/src/api/modules/enrollments", "backend/src/api/modules/cart"],
      dependsOn: ["auth-accounts", "catalog"],
      prdSections: ["§10.4", "§10.5", "§10.6", "§10.10", "§12.7", "§15.2", "§15.3", "§15.8", "§16.1"],
    },
    {
      id: "billing",
      name: "支付与财务",
      description: "支付模拟、账单、退款发起、收据、捐赠、财务报表。",
      ownedRoutes: ["/family/payment", "/family/billing", "/admin/finance"],
      ownedApiEndpoints: [
        "POST /api/v1/payments/intent", "POST /api/v1/payments/confirm", "GET /api/v1/payments/methods", "DELETE /api/v1/payments/methods/:id",
        "GET /api/v1/bills", "GET /api/v1/bills/:billId", "POST /api/v1/bills/:billId/refund-request", "GET /api/v1/bills/:billId/receipt",
        "GET /api/v1/admin/finance/summary", "GET /api/v1/admin/finance/bills", "POST /api/v1/admin/finance/bills/:billId/refund",
        "GET /api/v1/admin/finance/donations", "GET /api/v1/admin/finance/work-hours/export", "POST /api/v1/webhooks/stripe",
      ],
      ownedCollections: ["bills", "financeBills", "financeSummary", "donationRecords", "savedPaymentMethods"],
      ownedModules: ["backend/src/api/modules/payments", "backend/src/api/modules/bills", "backend/src/api/modules/finance"],
      dependsOn: ["enrollment"],
      prdSections: ["§10.7", "§10.9", "§12.8", "§15.4", "§16.2", "§17.1"],
    },
    {
      id: "scheduling",
      name: "教师排课与工时",
      description: "教师工作台、排课出勤、可授课时段、月度工时、学生名册、教室。",
      ownedRoutes: ["/teacher/dashboard", "/teacher/schedule", "/teacher/students", "/teacher/individual-work-time", "/teacher/work-hours", "/teacher/rooms", "/admin/teacher-dashboards", "/admin/rooms"],
      ownedApiEndpoints: [
        "GET /api/v1/teacher/dashboard", "GET /api/v1/teacher/lessons", "POST /api/v1/teacher/lessons/:lessonId/attendance", "POST /api/v1/teacher/lessons/:lessonId/leave-request",
        "GET /api/v1/teacher/students", "POST /api/v1/teacher/students/email",
        "GET /api/v1/teacher/availability", "POST /api/v1/teacher/availability", "PUT /api/v1/teacher/availability/:slotId",
        "GET /api/v1/teacher/work-hours", "POST /api/v1/teacher/work-hours/submit", "GET /api/v1/rooms",
      ],
      ownedCollections: ["teacherLessons", "teacherMetrics", "teacherDashboardSummary", "financeTeacherHours"],
      ownedModules: ["backend/src/api/modules/teacher", "backend/src/api/modules/rooms"],
      dependsOn: ["auth-accounts", "catalog"],
      prdSections: ["§11", "§15.6", "§15.7", "§15.12", "§16.3", "§16.4"],
    },
    {
      id: "learning",
      name: "家庭学习进度",
      description: "家庭工作台、我的课程(私教/团课/讲座/营)、日历、改约/请假/暂停。",
      ownedRoutes: ["/family/dashboard", "/family/lessons"],
      ownedApiEndpoints: [
        "GET /api/v1/lessons/private", "GET /api/v1/lessons/group", "POST /api/v1/lessons/private/:id/reschedule",
        "POST /api/v1/lessons/group/:id/leave", "POST /api/v1/lessons/group/:id/pause", "GET /api/v1/lessons/:id/sessions",
        "GET /api/v1/family/dashboard", "GET /api/v1/family/calendar",
      ],
      ownedCollections: ["familyEvents", "privateLessonManagement", "groupLessonManagement", "lectureCampManagement"],
      ownedModules: ["backend/src/api/modules/lessons", "frontend/src/pages/family/lessons"],
      dependsOn: ["enrollment", "scheduling"],
      prdSections: ["§10.1", "§10.8"],
    },
    {
      id: "approvals",
      name: "审批中心",
      description: "四类工作流(报名候补转正/退款/工时/请假)集中决策 + 并发锁。提交侧分散在各域。",
      ownedRoutes: ["/admin/approvals"],
      ownedApiEndpoints: [
        "GET /api/v1/admin/approvals", "POST /api/v1/admin/approvals/:id/approve",
        "POST /api/v1/admin/approvals/:id/reject", "POST /api/v1/admin/approvals/:id/lock",
      ],
      ownedCollections: ["approvals"],
      ownedModules: ["backend/src/api/modules/approvals"],
      dependsOn: ["enrollment", "billing", "scheduling"],
      prdSections: ["§12.2", "§15.13", "§17.3"],
    },
    {
      id: "messaging",
      name: "通知与消息",
      description: "家庭消息中心、通知模板、未读/已读。横切生产者(各域发通知)。",
      ownedRoutes: ["/family/messages", "/teacher/notifications", "/admin/notifications"],
      ownedApiEndpoints: [
        "GET /api/v1/notifications", "POST /api/v1/notifications/:id/read", "POST /api/v1/notifications/read-all",
        "GET /api/v1/admin/notifications", "POST /api/v1/admin/notifications", "POST /api/v1/admin/notifications/:id/publish",
      ],
      ownedCollections: ["notifications", "adminNotifications", "notificationTypeDictionary"],
      ownedModules: ["backend/src/api/modules/notifications"],
      dependsOn: ["auth-accounts"],
      prdSections: ["§10.11", "§12.13"],
    },
    {
      id: "admin-ops",
      name: "运营管理",
      description: "系统设置、报表、营销同步、活动同步、网站嵌入。报表经契约读各域数据。",
      ownedRoutes: ["/admin/settings", "/admin/reports", "/family/embed"],
      ownedApiEndpoints: [
        "GET /api/v1/admin/settings", "PUT /api/v1/admin/settings", "GET /api/v1/admin/settings/logs",
        "GET /api/v1/admin/reports/enrollment", "GET /api/v1/admin/reports/scheduling", "GET /api/v1/admin/reports/payroll",
        "GET /api/v1/admin/marketing/syncs", "POST /api/v1/admin/marketing/syncs/:system/run",
        "GET /api/v1/admin/events/feeds", "POST /api/v1/admin/events/feeds/refresh", "POST /api/v1/webhooks/eventbrite",
      ],
      ownedCollections: ["systemSettings", "marketingSyncs", "eventbriteFeeds", "activities"],
      ownedModules: ["backend/src/api/modules/settings", "backend/src/api/modules/reports", "backend/src/api/modules/integrations"],
      dependsOn: ["auth-accounts"],
      prdSections: ["§12.9", "§12.11", "§12.12", "§12.14", "§10.15"],
    },
  ],
};
