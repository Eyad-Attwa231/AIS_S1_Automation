export const translations = {
  en: {
    portalTitle: "Guest Requests & Feedback",
    hotelName: "Grand Horizon Hotel",
    nav: {
      createRequest: "Create Request",
      myRequests: "My Requests",
      complaints: "Complaints",
      feedback: "Feedback & Rating",
      logout: "Sign Out",
      roleAdmin: "Admin",
      roleGuest: "Guest",
      roleEmployee: "Staff",
      staffView: "Staff view: you are seeing all guests' requests and feedback (read only)."
    },
    auth: {
      signInTitle: "Sign In to Guest Portal",
      signUpTitle: "Register New Account",
      email: "Email address",
      password: "Password",
      fullName: "Full Name",
      phone: "Phone Number",
      submitSignIn: "Sign In",
      submitSignUp: "Create Account",
      noAccount: "Don't have an account? Sign up",
      haveAccount: "Already have an account? Sign in",
      authError: "Authentication error",
      fillAllFields: "Please fill all fields",
    },
    create: {
      title: "Create a Service Request or Complaint",
      subtitle: "Submit your request to our hotel team. Our automated system will classify and route it immediately.",
      typeLabel: "Request Type",
      types: {
        housekeeping: "Housekeeping",
        maintenance: "Maintenance",
        roomService: "Room Service",
        complaint: "Complaint",
        other: "Other"
      },
      roomLabel: "Select Room",
      noRoom: "No specific room / General area",
      currentBookingBadge: "Current Booking",
      descLabel: "Description of Request or Complaint",
      descPlaceholder: "Please describe what you need in detail (e.g. 'Please bring extra towels', 'The AC is not cooling properly', etc.)...",
      descHelp: "Provide specific details to help our team resolve your request promptly.",
      submitBtn: "Submit Request",
      submitting: "Submitting...",
      validationError: "Please enter a description (at least 5 characters)."
    },
    myRequests: {
      title: "My Requests",
      subtitle: "Track the real-time status of all your requests and complaints.",
      searchPlaceholder: "Search requests by description...",
      allStatuses: "All Statuses",
      allCategories: "All Categories",
      allPriorities: "All Priorities",
      classificationPending: "Classification pending",
      aiClassified: "AI classified",
      analysisPending: "Analysis pending",
      detailsBtn: "View Details",
      tableHeaders: {
        description: "Description",
        category: "Category",
        priority: "Priority",
        status: "Status",
        created: "Date",
        actions: "Details"
      },
      emptyTitle: "No requests found",
      emptyDesc: "You haven't submitted any service requests yet.",
      loadingTitle: "Loading requests...",
      detailDrawer: {
        title: "Request Details",
        description: "Full Description",
        category: "Department Category",
        priority: "Priority Level",
        aiSummary: "AI Generated Summary",
        sentiment: "Sentiment Analysis",
        close: "Close Drawer"
      }
    },
    complaints: {
      title: "Complaints Management",
      subtitle: "Review your submitted complaints, priority levels, and sentiment analysis.",
      emptyTitle: "No complaints on file",
      emptyDesc: "You haven't registered any complaints. We hope your stay remains wonderful!",
      fileComplaintBtn: "File a Complaint",
      sentimentLabel: "Sentiment"
    },
    feedback: {
      title: "Feedback & Experience Rating",
      subtitle: "Rate your stay and share your thoughts to help us continuously improve our service.",
      formTitle: "Submit New Feedback",
      ratingLabel: "Overall Rating",
      starUnit: "stars",
      commentLabel: "Your Comments / Review (Optional)",
      commentPlaceholder: "Tell us about your experience, staff service, room cleanliness, food quality...",
      bookingLabel: "Link to Stay / Booking (Optional)",
      noBooking: "General hotel experience (No booking linked)",
      submitBtn: "Submit Feedback",
      submitting: "Submitting...",
      successMsg: "Thank you for your feedback! Sentiment analysis is running.",
      historyTitle: "Submitted Feedback History",
      emptyHistory: "No feedback submitted yet. Share your experience with us!",
      analysisPending: "Analysis pending"
    },
    badges: {
      status: {
        new: "New",
        classified: "Classified",
        processing: "In Progress",
        resolved: "Resolved",
        cancelled: "Cancelled"
      },
      priority: {
        low: "Low",
        normal: "Normal",
        high: "High",
        urgent: "Urgent"
      },
      category: {
        housekeeping: "Housekeeping",
        maintenance: "Maintenance",
        room_service: "Room Service",
        complaint: "Complaint",
        other: "Other"
      },
      sentiment: {
        positive: "Positive",
        neutral: "Neutral",
        negative: "Negative"
      }
    },
    common: {
      refresh: "Refresh",
      retry: "Retry",
      errorTitle: "Something went wrong",
      roomPrefix: "Room",
      serviceUnavailable: "The service is temporarily unavailable. Please try again later."
    }
  },
  ar: {
    portalTitle: "طلبات النزلاء والملاحظات",
    hotelName: "فندق جراند هورايزون",
    nav: {
      createRequest: "طلب خدمة جديد",
      myRequests: "طلباتي",
      complaints: "الشكاوى",
      feedback: "التقييم والملاحظات",
      logout: "تسجيل الخروج",
      roleAdmin: "مدير النظام",
      roleGuest: "نزيل",
      roleEmployee: "طاقم العمل",
      staffView: "عرض الموظفين: تشاهد طلبات وتقييمات جميع النزلاء (للقراءة فقط)."
    },
    auth: {
      signInTitle: "تسجيل الدخول إلى بوابة النزيل",
      signUpTitle: "إنشاء حساب نزيل جديد",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      fullName: "الاسم الكامل",
      phone: "رقم الهاتف",
      submitSignIn: "دخول",
      submitSignUp: "إنشاء الحساب",
      noAccount: "ليس لديك حساب؟ سجّل الآن",
      haveAccount: "لديك حساب بالفعل؟ سجّل دخولك",
      authError: "خطأ في المصادقة",
      fillAllFields: "يرجى تعبئة جميع الحقول",
    },
    create: {
      title: "إنشاء طلب خدمة أو تسجيل شكوى",
      subtitle: "أرسل طلبك مباشرة إلى فريق الفندق. سيقوم نظام الذكاء الاصطناعي بتصنيفه وتوجيهه تلقائياً.",
      typeLabel: "نوع الطلب",
      types: {
        housekeeping: "خدمة الغرف والنظافة (Housekeeping)",
        maintenance: "الصيانة والأعطال (Maintenance)",
        roomService: "طلبات الطعام والمشروبات (Room Service)",
        complaint: "شكوى (Complaint)",
        other: "أخرى (Other)"
      },
      roomLabel: "تحديد الغرفة",
      noRoom: "لا توجد غرفة محددة / منطقة عامة",
      currentBookingBadge: "حجزك الحالي",
      descLabel: "تفاصيل الطلب أو الشكوى",
      descPlaceholder: "اكتب وصفاً مفصلاً لما تحتاجه (مثال: 'يرجى إحضار مناشف إضافية'، 'المكيف لا يبرد جيداً'، إلخ)...",
      descHelp: "يرجى كتابة التفاصيل بدقة لمساعدة فريق الفندق على تلبيتها بأسرع وقت.",
      submitBtn: "إرسال الطلب",
      submitting: "جارٍ الإرسال...",
      validationError: "يرجى كتابة وصف للطلب (5 أحرف على الأقل)."
    },
    myRequests: {
      title: "طلباتي",
      subtitle: "تابع حالة طلباتك وشكاواك وتصنيف الذكاء الاصطناعي لها بشكل فوري.",
      searchPlaceholder: "البحث في الطلبات حسب الوصف...",
      allStatuses: "جميع الحالات",
      allCategories: "جميع التصنيفات",
      allPriorities: "جميع الأولويات",
      classificationPending: "قيد التصنيف",
      aiClassified: "مصنف بالذكاء الاصطناعي",
      analysisPending: "قيد التحليل",
      detailsBtn: "التفاصيل",
      tableHeaders: {
        description: "الوصف",
        category: "القسم / التصنيف",
        priority: "الأولوية",
        status: "الحالة",
        created: "التاريخ",
        actions: "تفاصيل"
      },
      emptyTitle: "لا توجد طلبات مسجلة",
      emptyDesc: "لم تقم بتقديم أي طلبات حتى الآن.",
      loadingTitle: "جارٍ تحميل الطلبات...",
      detailDrawer: {
        title: "تفاصيل الطلب",
        description: "الوصف الكامل",
        category: "القسم المسؤول",
        priority: "مستوى الأولوية",
        aiSummary: "ملخص الذكاء الاصطناعي",
        sentiment: "تحليل المشاعر",
        close: "إغلاق النافذة"
      }
    },
    complaints: {
      title: "إدارة الشكاوى",
      subtitle: "استعراض شكاواك ومتابعة أولويتها ونتائج تحليل المشاعر بالذكاء الاصطناعي.",
      emptyTitle: "لا توجد شكاوى مسجلة",
      emptyDesc: "لا توجد أي شكاوى مسجلة بحسابك. نتمنى لك إقامة ممتعة ومريحة!",
      fileComplaintBtn: "تسجيل شكوى جديدة",
      sentimentLabel: "تحليل المشاعر"
    },
    feedback: {
      title: "التقييم والملاحظات",
      subtitle: "شاركنا تقييمك ورأيك حول إقامتك لنواصل تحسين جودة خدماتنا.",
      formTitle: "إضافة تقييم جديد",
      ratingLabel: "التقييم العام",
      starUnit: "نجوم",
      commentLabel: "ملاحظاتك ومراجعتك (اختياري)",
      commentPlaceholder: "أخبرنا برأيك عن مستوى الخدمة، نظافة الغرف، جودة الطعام، تعامل الطاقم...",
      bookingLabel: "ربط بالحجز / الإقامة (اختياري)",
      noBooking: "تقييم عام للفندق (بدون ربط بحجز معين)",
      submitBtn: "إرسال التقييم",
      submitting: "جارٍ الحفظ...",
      successMsg: "شكراً جزيلاً لتقييمك! جارٍ تشغيل تحليل المشاعر بواسطة n8n.",
      historyTitle: "سجل تقييماتي السابقة",
      emptyHistory: "لم ترسل أي تقييم بعد. رأيك يهمنا دائماً!",
      analysisPending: "قيد التحليل"
    },
    badges: {
      status: {
        new: "جديد",
        classified: "تم التصنيف",
        processing: "قيد التنفيذ",
        resolved: "تم الحل",
        cancelled: "ملغي"
      },
      priority: {
        low: "منخفضة",
        normal: "عادية",
        high: "عالية",
        urgent: "عاجلة"
      },
      category: {
        housekeeping: "نظافة وغرف",
        maintenance: "صيانة وأعطال",
        room_service: "خدمة طعام",
        complaint: "شكوى",
        other: "أخرى"
      },
      sentiment: {
        positive: "إيجابي",
        neutral: "محايد",
        negative: "سلبي"
      }
    },
    common: {
      refresh: "تحديث",
      retry: "إعادة المحاولة",
      errorTitle: "حدث خطأ غير متوقع",
      roomPrefix: "غرفة",
      serviceUnavailable: "الخدمة غير متاحة مؤقتاً. يرجى المحاولة لاحقاً."
    }
  }
};
