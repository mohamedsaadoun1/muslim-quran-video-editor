import os, re, shutil, requests, json
from datetime import datetime

try:
    GEMINI_API_KEY = "AIzaSyAVwL9OTXKftTHXqatG2hV07MN4erWXoBc"
    issue_title = """اهلا"""
    issue_body = """"""
    user_input = issue_title + "\n" + issue_body

    SYSTEM_PROMPT = '''
    أنت سوبر بوت للبرمجة وإدارة المشاريع على GitHub
    - افهم أي أوامر (عربي/إنجليزي/عامية/مختلطة)، ولو الأمر غير واضح اسأل المستخدم وحدد المطلوب.
    - نفذ أوامر مثل: "ابني لي تطبيق أندرويد فيه شات وفيديو وصلاحيات وقاعدة بيانات"، "أضف لي مشروع ويب كامل"، "احذف كل ملفات الصور"، "حلل الكود وأصلح كل المشاكل"، "ولّد اختبارات تغطي كل شيء"، "اعمل لي README وDocs كاملة"، "رجع كل حاجة زي الأسبوع اللي فات"، "ارفع التطبيق على Play Store"، "قفل ملفات معينة"، إلخ.
    - لو أمر فيه حذف جماعي/تعديل خطير، وضّح للمستخدم وخذ تأكيد قبل التنفيذ.
    - أي مشروع تولده يكون كامل، منظم، فيه كل الملفات (build, manifest, resources, main code, tests, docs).
    - دعم توليد مشاريع أندرويد ضخمة (Kotlin/Java/Flutter/React Native)، مع كل ملفاتها وملفات البناء والتوثيق.
    - دعم توليد مشاريع بأي لغة أو تقنية أو معمارية (monorepo, microservices, plugins, إلخ).
    - نفذ تحليل أمان وكود لأي أمر قبل التنفيذ، ولو فيه خطأ أو خطر اشرح السبب واقترح حلول.
    - نفذ أوامر Undo/Redo/History، واحتفظ بنسخ احتياطية تلقائية.
    - لو طلب المستخدم شرح أو تلخيص أو مقارنة أو تحليل، رد عليه بتفصيل وذكاء.
    - لو طلب منه ينفذ أمر على كل المشروع أو مجلد كامل (bulk)، نفذها بأمان وكفاءة.
    - لو طلب نشر أو رفع المشروع على أي منصة، وضّح الخطوات أو نفّذ ما يمكن تلقائيًا.
    - إذا كان هناك ملف يجب توليده، أرسله بـ:
    ```file
    name=اسم_الملف
    محتوى_الملف
    ```
    - لو فيه عدة ملفات، كل ملف في block منفصل.
    - لو طلب مثال أو اختبار أو وثيقة أو شرح، أضفهم بنفس الشكل.
    - لو الأمر غير منطقي أو خطير أو ناقص بيانات، أوقف التنفيذ واطلب من المستخدم توضيح أو تأكيد.
    - بعد كل عملية، وضّح بالضبط ما تم وما هي الخطوات القادمة، ولو فيه مشاكل أو تحذيرات اذكرها.
    '''

    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"parts": [{"text": SYSTEM_PROMPT}]},
            {"parts": [{"text": user_input}]}
        ]
    }

    resp = requests.post(endpoint, json=payload, headers=headers, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Gemini API Error: {resp.status_code} {resp.text}")

    data = resp.json()
    answer = ""
    # Gemini response structure
    try:
        answer = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        answer = str(data)

    files = re.findall(r"```file\s+name=([^\n]+)\n(.*?)```", answer, re.DOTALL)
    os.makedirs(".github/bot_backups", exist_ok=True)
    log = []

    for fname, content in files:
        if os.path.exists(fname):
            ts = datetime.now().strftime('%Y%m%d%H%M%S')
            bak = f".github/bot_backups/{fname.replace('/','_')}.{ts}.bak"
            os.makedirs(os.path.dirname(bak), exist_ok=True)
            shutil.copy2(fname, bak)
            log.append(f"نسخة احتياطية: {bak}")
        os.makedirs(os.path.dirname(fname), exist_ok=True)
        with open(fname, "w", encoding="utf-8") as f:
            f.write(content)
        log.append(f"تم إنشاء/تعديل: {fname}")

    errors = []
    if "خطأ" in answer or "error" in answer.lower():
        errors.append("⚠️ قد يكون هناك أخطاء أو مشاكل في جزء من الكود. راجع التفاصيل في الأعلى.")

    with open("results.log", "w", encoding="utf-8") as out:
        out.write("**رد بوت Gemini:**\n\n")
        out.write(answer + "\n\n")
        if log:
            out.write("**سجل العمليات:**\n")
            out.write("\n".join(log) + "\n\n")
        if errors:
            out.write("**تحذيرات:**\n")
            out.write("\n".join(errors))
except Exception as e:
    with open("results.log", "w", encoding="utf-8") as out:
        out.write(f"حدث خطأ أثناء تنفيذ سكريبت Gemini:\n{str(e)}\n")
