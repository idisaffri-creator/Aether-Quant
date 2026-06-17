curl -s -X POST -H "Content-Type: application/json" -d "{\"email\":\"demo@aether-energy.ai\",\"password\":\"demo123\"}" https://aether-energy.ai/api/auth/login > /tmp/login.json
python3 -c "import json; t=json.load(open('/tmp/login.json'))['token']; open('/tmp/t','w').write(t)"
TOKEN=$(cat /tmp/t)
echo "token: ${TOKEN:0:30}..."
echo "=== test strategies endpoints ==="
for path in strategies/custom backtest; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "https://aether-energy.ai/api/$path")
  echo "GET /api/$path: $code"
done
echo "=== create test strategy ==="
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Test WTI RSI Strategy\",\"description\":\"Buy when RSI < 30\",\"symbol\":\"CL\",\"conditions\":[{\"indicator\":\"rsi\",\"threshold\":30,\"comparison\":\"lt\",\"lookback\":14}],\"actions\":[{\"type\":\"buy\",\"quantity\":10,\"orderType\":\"market\"}],\"enabled\":true}" https://aether-energy.ai/api/strategies/custom | head -c 200
echo
echo "=== list strategies ==="
curl -s -H "Authorization: Bearer $TOKEN" https://aether-energy.ai/api/strategies/custom | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('strategies:', len(d.get('strategies',[])))
for s in d.get('strategies',[]):
    print(' -', s['name'], s['symbol'], 'enabled='+str(s['enabled']))
"