# چک‌لیست امنیت و تحویل Alert Tradie Pro

نسخه: 2026-08-17

| مورد | وضعیت | توضیح |
|---|---:|---|
| حذف ایمیل و هویت شخصی از سورس عمومی | انجام شد | اسکن خودکار release اضافه شد. |
| عدم ذخیره password/token در LocalStorage | انجام شد | sessionهای واقعی فقط cookie سروری HttpOnly هستند. |
| حساب Owner | انجام شد | فقط ایمیل و پسورد ثبت‌شده؛ بدون صفحه یا کد جداگانه. |
| ورود واحد Owner و Team | انجام شد | یک فرم مشترک؛ Owner بدون Team Code و عضو جدید با Team Code. |
| تأیید و نقش تیم | انجام شد | درخواست در داشبورد Owner می‌آید و نقش در دیتابیس ذخیره می‌شود. |
| محدودسازی تلاش login | انجام شد | پنج تلاش؛ قفل 15 دقیقه‌ای. |
| نقش‌ها و دسترسی محدود | انجام شد | Owner کامل؛ Admin بدون Finance؛ Supervisor/Worker فقط پروژه و فایل تخصیص‌یافته. |
| جلوگیری از project-code enumeration | انجام شد | Tracking فقط با reference تصادفی 128 بیتی. |
| rate limit درخواست مشتری و tracking | انجام شد | محدودیت IP و پیام خطای عمومی. |
| آپلود امن | انجام شد | فقط تصویر معتبر؛ magic-byte check؛ SVG و active content رد می‌شود. |
| Security headers | انجام شد | CSP، HSTS، no-sniff، deny framing، referrer و permissions policy. |
| دادهٔ پیش‌فرض صفر | انجام شد | production seed خاموش و dashboard بدون داده صفر است. |
| نمودار مالی واقعی | انجام شد | Income/Outcome و Estimate/Actual از دادهٔ ذخیره‌شده. |
| گردش Quality Inspection تا Completion | انجام شد | عکس اجباری، review ادمین و completion فقط توسط Owner. |
| رضایت Terms/Privacy | انجام شد | consent با نسخه و زمان ذخیره می‌شود. |
| WordPress بدون دسترسی به دادهٔ حساس | انجام شد | Bridge فقط link امن می‌سازد؛ iframe/proxy/ذخیره‌سازی ندارد. |
| تست خودکار release | انجام شد | تست‌های build/security/workflow باید سبز بماند. |
| بازبینی حقوقی Victoria | قبل از launch | وکیل باید متن قرارداد و Terms را تأیید کند. |
| تست نفوذ مستقل | قبل از launch | OWASP ASVS/API، auth، access control و file upload. |
| مانیتورینگ و incident response | قبل از launch | alert، log بدون PII، rotation و NDB process. |
| backup/restore واقعی | قبل از launch | backup رمزگذاری‌شده و restore drill. |

معیار انتشار این است: secret در سورس نباشد، دسترسی هر نقش در backend کنترل شود، rate limit فعال باشد، داده رمزگذاری و مانیتور شود و تست مستقل قبل از production انجام شود.
