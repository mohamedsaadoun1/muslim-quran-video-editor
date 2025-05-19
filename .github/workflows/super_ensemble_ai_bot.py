import os
import re
import shutil
import json
import requests
from datetime import datetime

try:
    from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
except ImportError:
    print("يجب تثبيت transformers و torch و sentencepiece")
    exit(1)

# OpenAI
def try_openai(prompt, max_tokens=400):
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        return None, "OpenAI: لا يوجد مفتاح."
    try:
        import openai
        openai.api_key = api_key
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content.strip(), "OpenAI"
    except Exception as e:
        return None, f"OpenAI خطأ: {e}"

# Gemini (Google)
def try_gemini(prompt):
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None, "Gemini: لا يوجد مفتاح."
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    try:
        resp = requests.post(url, headers=headers, data=json.dumps(data), timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            out = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            return out.strip(), "Gemini"
        return None, f"Gemini error: {resp.status_code} - {resp.text}"
    except Exception as e:
        return None, f"Gemini exception: {e}"

# DeepSeek
def try_deepseek(prompt, max_tokens=400):
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not api_key:
        return None, "DeepSeek: لا يوجد مفتاح."
    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_tokens
    }
    try:
        resp = requests.post(url, headers=headers, data=json.dumps(data), timeout=60)
        if resp.status_code == 200:
            result = resp.json()
            out = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            return out.strip(), "DeepSeek"
        return None, f"DeepSeek error: {resp.status_code} - {resp.text}"
    except Exception as e:
        return None, f"DeepSeek exception: {e}"

# نماذج مفتوحة (تشغيل محلي بدون أي API)
def run_model(model_id, prompt, max_new_tokens=256):
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForCausalLM.from_pretrained(model_id)
        pipe = pipeline("text-generation", model=model, tokenizer=tokenizer, device=-1)
        result = pipe(prompt, max_new_tokens=max_new_tokens, do_sample=True, temperature=0.7)[0]['generated_text']
        return result.strip()
    except Exception as e:
        return f"[{model_id}]: تعذر التشغيل: {e}"

def ensemble_models(prompt):
    responses = []
    models = [
        # أقوى وأشهر النماذج المجانية (بدون API)
        ("meta-llama/Meta-Llama-3-8B-Instruct", "Llama-3-8B"),
        ("mistralai/Mixtral-8x7B-Instruct-v0.1", "Mixtral-8x7B"),
        ("Qwen/Qwen2-7B-Instruct", "Qwen2-7B"),
        ("01-ai/Yi-9B-Chat", "Yi-9B"),
        ("HuggingFaceH4/zephyr-7b-beta", "Zephyr"),
        ("microsoft/phi-3-mini-4k-instruct", "Phi-3"),
        ("teknium/OpenHermes-2.5-Mistral-7B", "OpenHermes"),
        ("TinyLlama/TinyLlama-1.1B-Chat-v1.0", "TinyLlama"),
        ("TheBloke/TinyMistral-248M-Chat-GGUF", "TinyMistral"),
        # نماذج برمجة:
        ("deepseek-ai/deepseek-coder-1.3b-instruct", "Deepseek-Coder"),
        ("codellama/CodeLlama-7b-Instruct-hf", "CodeLlama"),
        ("WizardLM/WizardCoder-7B-V1.0", "WizardCoder"),
        ("bigcode/starcoder2-7b", "StarCoder2"),
    ]
    for model_id, name in models:
        answer = run_model(model_id, prompt)
        responses.append(f"---\n{name}:\n{answer}\n")
    all_text = "\n".join([r for r in responses if "تعذر التشغيل" not in r])
    return all_text if all_text else "❌ تعذر الحصول على أي رد من النماذج المفتوحة."

# تحليل وإنشاء ملفات أوتوماتيكياً
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

def main():
    # استقبال السؤال من متغير بيئة أو مباشرة
    user_input = os.environ.get("USER_QUESTION", "اشرح لي الذكاء الاصطناعي وأهم تطبيقاته.")
    SYSTEM_PROMPT = """أنت بوت ذكاء اصطناعي خارق تدمج بين OpenAI, Gemini, DeepSeek, وأقوى النماذج المفتوحة.
لو اختلفت الردود، لخصها أو دمجها أو اختر الأوضح والأشمل ووضح الفروق. لو فيه كود أو ملفات أنشئها تلقائيًا."""
    prompt = SYSTEM_PROMPT + "\n" + user_input.strip()

    answers = []
    sources = []

    # جرب OpenAI
    a, s = try_openai(prompt)
    if a:
        answers.append(a)
        sources.append(s)

    # جرب Gemini
    a, s = try_gemini(prompt)
    if a:
        answers.append(a)
        sources.append(s)

    # جرب DeepSeek
    a, s = try_deepseek(prompt)
    if a:
        answers.append(a)
        sources.append(s)

    # جرب النماذج المفتوحة (بدون API)
    open_source_ans = ensemble_models(prompt)
    answers.append(open_source_ans)
    sources.append("نماذج مفتوحة (تشغيل محلي بدون API)")

    # دمج الردود
    full_answer = "\n\n=====\n\n".join(
        [f"**{src}:**\n{ans}" for ans, src in zip(answers, sources) if ans]
    )

    log = parse_files(full_answer)
    print(f"\n--- الرد النهائي (دمج جميع المصادر) ---\n")
    print(full_answer)
    if log:
        print("\nسجل العمليات:\n" + "\n".join(log))

if __name__ == "__main__":
    main()
