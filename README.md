# Muslim Quran Video Editor - محرر فيديوهات القرآن الكريم للمسلمين

**محرر فيديوهات القرآن الكريم للمسلمين** هو تطبيق ويب متقدم وسهل الاستخدام مصمم لمساعدة المستخدمين على إنشاء مقاطع فيديو قرآنية جذابة ومؤثرة بصريًا. يتيح التطبيق دمج آيات القرآن الكريم مع التلاوات الصوتية، والترجمات، والخلفيات المتنوعة (صور، فيديوهات، أو ألوان ثابتة)، بالإضافة إلى مجموعة من التأثيرات النصية والمرئية.

يهدف هذا المشروع إلى توفير أداة قوية للمسلمين لمشاركة آيات الله بطريقة إبداعية وحديثة، سواء للاستخدام الشخصي، أو التعليمي، أو الدعوي عبر منصات التواصل الاجتماعي.

## ✨ الميزات الرئيسية

*   **اختيار السور والآيات:**
    *   واجهة سهلة لاختيار السورة ومجموعة الآيات المطلوبة.
    *   دعم البحث الصوتي عن السور والآيات (قيد التطوير).
*   **التلاوات الصوتية:**
    *   مجموعة متنوعة من القراء المشهورين للاختيار من بينهم.
    *   مزامنة دقيقة بين الصوت ونص الآية المعروضة.
    *   التحكم في التأخير الزمني بين الآيات.
*   **الترجمات:**
    *   دعم ترجمات معاني القرآن الكريم بلغات متعددة.
    *   إمكانية عرض الترجمة بشكل متزامن مع الآية.
*   **تخصيص الخلفيات:**
    *   استيراد صور أو مقاطع فيديو كخلفية.
    *   اختيار لون ثابت كخلفية.
    *   اقتراحات خلفيات ذكية (AI) بناءً على محتوى الآيات أو كلمات مفتاحية (باستخدام Pexels API).
*   **تخصيص النص:**
    *   مجموعة من الخطوط العربية الجميلة والمناسبة للقرآن الكريم.
    *   التحكم الكامل في حجم ولون خط الآيات والترجمة.
    *   إمكانية إضافة لون خلفية لنص الآية لتمييزه.
    *   تأثيرات نصية متنوعة (مثل التلاشي، الكتابة التدريجية).
*   **تأثيرات الفيديو:**
    *   فلاتر فيديو متنوعة لتغيير مظهر الفيديو (رمادي، بني داكن، سطوع، تباين، ضبابي، إلخ).
    *   التحكم في أبعاد الفيديو (16:9, 9:16, 1:1, 4:3) ليناسب مختلف المنصات.
*   **إدارة المشاريع:**
    *   حفظ المشاريع محليًا في المتصفح للعودة إليها لاحقًا.
    *   عرض قائمة بالمشاريع المحفوظة مع إمكانية التحرير، التكرار، أو الحذف.
    *   تسمية وتعديل أسماء المشاريع.
*   **المعاينة المباشرة:**
    *   معاينة فورية للتغييرات على الفيديو أثناء عملية التحرير.
    *   عناصر تحكم لتشغيل وإيقاف الفيديو والانتقال بين الآيات.
    *   شريط زمني تفاعلي لعرض والتحكم في تقدم الفيديو.
*   **التصدير:**
    *   تصدير الفيديو بتنسيقات ودقات مختلفة (WebM, GIF - MP4 قيد التطوير).
    *   التحكم في معدل الإطارات (FPS).
    *   عرض تقدم عملية التصدير.
*   **واجهة مستخدم حديثة وسهلة:**
    *   تصميم جذاب ومرتب باللغة العربية (RTL).
    *   دعم السمات الفاتحة والداكنة (Light/Dark Mode).
    *   تصميم متجاوب يعمل بشكل جيد على مختلف أحجام الشاشات (بما في ذلك الهواتف المحمولة).
*   **تطبيق ويب تقدمي (PWA):**
    *   إمكانية تثبيت التطبيق على الجهاز للاستخدام دون اتصال بالإنترنت (بشكل محدود).
    *   أيقونات واختصارات للشاشة الرئيسية.

## 🛠️ التقنيات المستخدمة

*   **الواجهة الأمامية (Frontend):**
    *   HTML5
    *   CSS3 (مع متغيرات CSS للسمات والتصميم المرن)
    *   JavaScript (ES6+ Modules)
*   **واجهات برمجة تطبيقات (APIs):**
    *   [Alquran.cloud API](https://alquran.cloud/api): لجلب بيانات القرآن الكريم (السور، الآيات، التلاوات، الترجمات).
    *   [Pexels API](https://www.pexels.com/api/): لاقتراحات الصور ومقاطع الفيديو كخلفيات.
*   **مكتبات JavaScript (يتم استيرادها أو عبر CDN):**
    *   [Axios](https://axios-http.com/): (اختياري إذا استخدم `fetch` مباشرة) لإجراء طلبات HTTP إلى APIs.
    *   [CCapture.js](https://github.com/spite/ccapture.js/): لتسجيل إطارات الكانفاس وتصدير الفيديو (WebM, GIF).
    *   [TinyColor](https://github.com/bgrins/TinyColor): (إذا تم استخدامها) لمعالجة الألوان.
    *   FontAwesome: للأيقونات.
*   **ميزات المتصفح الحديثة:**
    *   Canvas API: لعرض ومعالجة الفيديو والنصوص.
    *   Web Audio API: (بشكل غير مباشر عبر عنصر `<audio>`) للتحكم في تشغيل الصوت.
    *   Web Speech API: (اختياري) للبحث الصوتي.
    *   LocalStorage: لحفظ المشاريع والإعدادات محليًا.
    *   Service Workers: لتمكين وظائف PWA.

## 🚀 كيفية البدء

1.  **استنساخ المستودع (Clone the repository):**
    ```bash
    git clone https://github.com/your-username/Muslim-Quran-Video-Editor.git
    cd Muslim-Quran-Video-Editor-main
    ```
2.  **مفتاح Pexels API (اختياري ولكن موصى به):**
    *   للاستفادة من ميزة اقتراحات الخلفيات الذكية (AI)، ستحتاج إلى مفتاح Pexels API.
    *   احصل على مفتاح مجاني من [Pexels API](https://www.pexels.com/api/documentation/).
    *   قم بإنشاء ملف `js/config/api-keys.config.js` وأضف مفتاحك:
        ```javascript
        // js/config/api-keys.config.js
        export const PEXELS_API_KEY = 'YOUR_PEXELS_API_KEY_HERE';
        ```
3.  **فتح التطبيق:**
    *   افتح ملف `index.html` مباشرة في متصفح ويب حديث (مثل Chrome, Firefox, Edge).
    *   أو، للحصول على تجربة تطوير أفضل (مع إعادة تحميل مباشر عند التغيير)، يمكنك استخدام خادم ويب محلي بسيط مثل `live-server` (امتداد لـ VS Code أو عبر npm).

## Screenshots

*(أضف هنا صورًا لواجهة التطبيق إذا كانت متوفرة)*
*   `screenshots/screenshot1.png` - واجهة المحرر الرئيسية
*   `screenshots/screenshot2.png` - اختيار السورة والآيات

## 🗺️ هيكل المشروع (مُحدَّث)
muslim-quran-video-editor-main/
├── index.html                     // HTML الرئيسي للتطبيق.
├── manifest.json                  // بيان تطبيق الويب التقدمي (PWA).
├── sw.js                          // ملف Service Worker للوظائف غير المتصلة والتخزين المؤقت.
├── css/
│   └── style.css                  // الأنماط العامة للتطبيق.
├── icons/                         // أيقونات التطبيق المختلفة.
│   └── ...
├── assets/                        // الأصول الثابتة (صور افتراضية، خطوط).
│   ├── images/
│   └── fonts/
│
├── js/
│   ├── main.js                    // نقطة الدخول الرئيسية للتطبيق.
│   │
│   ├── core/                      // الوحدات الأساسية الحيوية (مخزن الحالة، معالج الأحداث، إلخ).
│   │   ├── dom-elements.js
│   │   ├── state-store.js
│   │   ├── event-aggregator.js
│   │   ├── error-logger.js
│   │   ├── module-bootstrap.js
│   │   ├── resource-manager.js
│   │   └── localization.service.js
│   │
│   ├── services/                  // واجهات مجردة للعمليات الخارجية (APIs، Browser APIs).
│   │   ├── quran.api.client.js
│   │   ├── pexels.api.client.js
│   │   ├── local-storage.adapter.js
│   │   ├── speech.recognition.wrapper.js
│   │   └── file.io.utils.js
│   │
│   ├── shared-ui-components/      // مكونات واجهة مستخدم عامة وقابلة لإعادة الاستخدام.
│   │   ├── theme.controller.js
│   │   ├── panel.manager.js
│   │   ├── notification.presenter.js
│   │   ├── spinner.view.js
│   │   ├── modal.factory.js
│   │   └── dynamic-select.builder.js
│   │
│   ├── features/                  // الميزات الرئيسية للتطبيق، كل ميزة معزولة.
│   │   │
│   │   ├── project-manager/       // إدارة دورة حياة المشروع.
│   │   │   ├── project.model.js
│   │   │   ├── project-list.renderer.js
│   │   │   ├── project.actions.js
│   │   │   ├── project.selectors.js
│   │   │   └── project.events.js    // (اختياري)
│   │   │
│   │   ├── quran-provider/        // جلب وعرض بيانات القرآن واختيارات المستخدم.
│   │   │   ├── quran.data.cache.js
│   │   │   ├── quran-selector.ui.js
│   │   │   ├── quran-verse.analyzer.js
│   │   │   ├── quran-voice-input.handler.js
│   │   │   └── quran.state.config.js // (اختياري)
│   │   │
│   │   ├── background-controller/ // إدارة خلفية الفيديو.
│   │   │   ├── background.state.js
│   │   │   ├── background-importer.ui.js
│   │   │   ├── background-ai.connector.js
│   │   │   ├── background-color.chooser.js
│   │   │   └── background.actions.js
│   │   │
│   │   ├── text-engine/           // محرك عرض النص القرآني والترجمة.
│   │   │   ├── text.styling.options.js
│   │   │   ├── text-styler.ui.js
│   │   │   ├── text.rendering.logic.js
│   │   │   └── text.state.adapter.js
│   │   │
│   │   ├── audio-engine/          // محرك الصوتيات (التلاوة، التأخيرات، إلخ).
│   │   │   ├── ayah-audio.retriever.js
│   │   │   ├── main-playback.controller.js
│   │   │   ├── timeline.updater.ui.js
│   │   │   ├── audio.settings.manager.js
│   │   │   ├── background-audio.mixer.js // (مستقبلي)
│   │   │   └── audio-track-extractor.js  // (مستقبلي)
│   │   │
│   │   ├── canvas-composer/       // تجميع كل العناصر المرئية على الكانفاس.
│   │   │   ├── main-renderer.js
│   │   │   ├── canvas.dimension.handler.js
│   │   │   ├── video-filter.applier.js
│   │   │   └── canvas.snapshot.service.js
│   │   │
│   │   ├── video-exporter/        // عملية تصدير الفيديو النهائي.
│   │   │   ├── export-settings.ui.js
│   │   │   ├── ccapture.recorder.js
│   │   │   ├── export.progress.tracker.js
│   │   │   └── ffmpeg.integration.js   // (مستقبلي)
│   │   │
│   │   └── editor-shell/          // "القشرة" أو الإطار العام لواجهة محرر الفيديو.
│   │       ├── screen.navigator.js
│   │       ├── main-toolbar.handler.js
│   │       ├── playback-control-strip.ui.js
│   │       ├── project-title.editor.js
│   │       └── global-shortcuts.binder.js // (مستقبلي)
│   │
│   ├── utils/                     // دوال مساعدة بحتة (Pure functions).
│   │   ├── time.formatter.js
│   │   ├── dom.manipulator.js
│   │   ├── text.layout.utils.js
│   │   ├── async.helpers.js
│   │   ├── string.enhancer.js
│   │   └── math.operations.js
│   │
│   ├── config/                    // ملفات الإعدادات والقيم الثابتة.
│   │   ├── api-keys.config.js     // (يُضاف إلى .gitignore)
│   │   ├── app.constants.js
│   │   ├── feature.flags.config.js
│   │   ├── default-project.schema.js
│   │   └── app.settings.schema.js
│   │
│   └── vendor/                    // المكتبات الخارجية المستضافة ذاتيًا.
│       └── ...
│
├── tests/                         // اختبارات الوحدة والتكامل.
│   ├── core/
│   ├── services/
│   ├── features/
│   │   └── ...
│   └── utils/
│
└── README.md


## 📝 قائمة المهام (ToDo) / ميزات مستقبلية

*   [ ] **تحسين البحث الصوتي:** دعم أوامر أكثر تعقيدًا لتحديد الآيات.
*   [ ] **تأثيرات انتقالية بين الآيات:** إضافة انتقالات مرئية (Fade, Slide) عند التصدير.
*   [ ] **موسيقى خلفية:** إمكانية إضافة ملف صوتي كموسيقى خلفية والتحكم في مستوى صوته (`audio-engine/background-audio.mixer.js`).
*   [ ] **استخراج الصوت:** استخراج المسار الصوتي من فيديو الخلفية لاستخدامه (`audio-engine/audio-track-extractor.js`).
*   [ ] **دعم FFmpeg.wasm:** لتصدير MP4 مع دمج الصوت مباشرة في المتصفح (`video-exporter/ffmpeg.integration.js`).
*   [ ] **مشاركة مباشرة:** إمكانية مشاركة الفيديو المصدر مباشرة إلى منصات التواصل (إذا سمحت المنصات بذلك).
*   [ ] **قوالب جاهزة:** توفير قوالب تصميم جاهزة لتسريع عملية إنشاء الفيديو.
*   [ ] **ميزات متقدمة للنص:** محاذاة النص، ظلال، تحديد الموضع بدقة.
*   [ ] **تحسينات الأداء:** خاصة لعمليات التصدير ومعاينة الفيديو (`canvas-composer`، `video-exporter`).
*   [ ] **ترجمة واجهة المستخدم:** دعم لغات إضافية لواجهة التطبيق (`core/localization.service.js`).
*   [ ] **اختبارات شاملة:** كتابة اختبارات وحدوية وتكاملية لضمان جودة الكود (`tests/`).
*   [ ] **توثيق الكود:** إضافة المزيد من التعليقات والشروحات التفصيلية للكود (JSDoc).

## 🤝 المساهمة

نرحب بالمساهمات لتحسين هذا المشروع! إذا كنت ترغب في المساهمة، يرجى اتباع الخطوات التالية:

1.  قم بعمل Fork للمستودع.
2.  أنشئ فرعًا جديدًا لميزتك أو إصلاحك (`git checkout -b feature/AmazingFeature` أو `bugfix/IssueDescription`).
3.  قم بإجراء التغييرات اللازمة وقم بعمل Commit لها (`git commit -m 'Add some AmazingFeature'`).
4.  قم برفع تغييراتك إلى الفرع (`git push origin feature/AmazingFeature`).
5.  افتح طلب سحب (Pull Request).

يرجى التأكد من أن الكود الخاص بك يتبع معايير الكود المتبعة في المشروع وأن مساهمتك مفيدة للمجتمع.

## 📄 الترخيص

هذا المشروع مرخص بموجب ترخيص [MIT License](LICENSE.md) (إذا قمت بإضافة ملف ترخيص). يمكنك تعديل هذا حسب الترخيص الذي تختاره.

---

نأمل أن يكون هذا المشروع مفيدًا ونافعًا. نسأل الله التوفيق والسداد.
