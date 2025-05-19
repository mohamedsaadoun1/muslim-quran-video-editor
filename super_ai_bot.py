import os, re, shutil, requests, json
from datetime import datetime

GEMINI_API_KEY = "AIzaSyAVwL9OTXKftTHXqatG2hV07MN4erWXoBc"
OPENAI_API_KEY = "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"

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

def run_gemini(system_prompt, user_input):
    endpoint = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={GEMINI_API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [
            {"parts": [{"text": system_prompt + "\n" + user_input}]}
        ]
    }
    resp = requests.post(endpoint, json=payload, headers=headers, timeout=60)
    if resp.status_code != 200:
        raise Exception(f"Gemini API Error: {resp.status_code}\n{resp.text}")
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return str(data)

def run_openai(system_prompt, user_input):
    import openai
    openai.api_key = OPENAI_API_KEY
    resp = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_input}
        ],
        max_tokens=4096,
        temperature=0.1
    )
    return resp.choices[0].message.content.strip()

def parse_files(answer):
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
    return log

try:
    issue_title = """اهلا"""
    issue_body = """"""
    user_input = issue_title + "\n" + issue_body

    # جرب Gemini أولاً
    try:
        answer = run_gemini(SYSTEM_PROMPT, user_input)
        source = "Gemini"
    except Exception as e:
        answer = f"حدث خطأ مع Gemini، سيتم تجربة OpenAI...\n{str(e)}\n"
        source = "Gemini (خطأ)"
        # جرب OpenAI
        try:
            openai_answer = run_openai(SYSTEM_PROMPT, user_input)
            answer += "\n\n---\n\n" + openai_answer
            source = "OpenAI"
        except Exception as oe:
            answer += f"\nحدث خطأ أيضًا مع OpenAI:\n{str(oe)}"
            source = "OpenAI (خطأ)"

    log = parse_files(answer)
    errors = []
    if "خطأ" in answer or "error" in answer.lower():
        errors.append("⚠️ قد يكون هناك أخطاء أو مشاكل في جزء من الكود. راجع التفاصيل في الأعلى.")

    with open("results.log", "w", encoding="utf-8") as out:
        out.write(f"**رد البوت ({source}):**\n\n")
        out.write(answer + "\n\n")
        if log:
            out.write("**سجل العمليات:**\n")
            out.write("\n".join(log) + "\n\n")
        if errors:
            out.write("**تحذيرات:**\n")
            out.write("\n".join(errors))
except Exception as e:
    with open("results.log", "w", encoding="utf-8") as out:
        out.write(f"حدث خطأ أثناء تنفيذ سكريبت البوت:\n{str(e)}\n")
