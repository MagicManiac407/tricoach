import re, json

content = open('js/dashboard.js').read()
m = re.search(r'const STRAVA_ACTS = (\{.*?\});', content, re.DOTALL)
raw = m.group(1)

# Replace literal control characters (newlines, tabs, carriage returns) with a space
cleaned = re.sub(r'[\x00-\x1f]', ' ', raw)

# Verify it parses now
data = json.loads(cleaned)
print(f'✅ Parsed OK - {len(data["acts"])} activities')

# Write back cleanly
new_json = json.dumps(data, ensure_ascii=False)
new_content = content[:m.start(1)] + new_json + content[m.end(1):]
open('js/dashboard.js', 'w', encoding='utf-8').write(new_content)
print('✅ dashboard.js cleaned and saved')
