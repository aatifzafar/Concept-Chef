import google.generativeai as genai

genai.configure(api_key="AIzaSyCdrDFQHeOVSiKnNY8dBk91Hv8ZwkoSF94")

print("Available models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)