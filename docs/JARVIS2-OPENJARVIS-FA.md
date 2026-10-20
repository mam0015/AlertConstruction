# جارویس ۲ — اجرای OpenJarvis روی کامپیوتر یا سرور خودتان

نسخهٔ انگلیسی: [`JARVIS2-OPENJARVIS.md`](JARVIS2-OPENJARVIS.md)

**جارویس ۱** همان Claude است (هوش مصنوعی ابریِ شرکت Anthropic). **جارویس ۲** برنامهٔ [OpenJarvis](https://github.com/open-jarvis/OpenJarvis) است
(متن‌باز، مجوز Apache 2.0) که روی دستگاهی که **خودتان** دارید اجرا می‌شود. در صفحهٔ **Owner → Jarvis** انتخاب می‌کنید کدام جواب بدهد.
هر دو دقیقاً یک چیز را می‌بینند، یک قواعد را رعایت می‌کنند و یک کار را می‌توانند انجام دهند (خبر، برنامه‌ها، نوشتن و بازخوانی ایمیل،
آماده‌کردن پیام، تقویم و کار). فقط «مغز» فرق می‌کند.

**چرا جارویس ۲:** داده‌ها فقط به سرور خودتان می‌رود، نه به Anthropic، و برای هر سؤال پولی پرداخت نمی‌شود.
**هزینهٔ آن:** باید یک دستگاه همیشه روشن باشد و کیفیت نوشتن به مدلی که می‌گذارید بستگی دارد. مدل کوچک ضعیف‌تر می‌نویسد؛
جارویس هر چیزی را که برگردد چک می‌کند و بدون دکمهٔ شما هیچ کاری نمی‌کند، ولی فرق را حس می‌کنید.

## چه چیزی لازم است
- یک دستگاه همیشه روشن: کامپیوتر دفتر یا یک سرور ابری کوچک (VPS). کارت گرافیک لازم نیست، ولی حافظه مهم است:

  | حافظه | مدل پیشنهادی OpenJarvis | برای جارویس؟ |
  |---|---|---|
  | RAM بین ۵ تا ۱۴ گیگ | `qwen3.5:2b` | برای تکیه‌کردن کوچک است |
  | RAM بین ۱۵ تا ۲۴ گیگ | `qwen3.5:4b` | ساده |
  | RAM بین ۲۵ تا ۴۴ گیگ | `qwen3.5:9b` | **حداقل پیشنهادی** |
  | RAM بالای ۴۵ گیگ | `qwen3.5:27b` | بهترین |

- حدود یک ساعت وقت. اگر با ترمینال آشنا نیستید از کسی که کامپیوترهای شما را نگه می‌دارد کمک بگیرید.

## قدم ۱ — نصب OpenJarvis
طبق README خودشان (مک، لینوکس): `curl -fsSL https://open-jarvis.github.io/OpenJarvis/install.sh | bash`
(ویندوز: `irm https://open-jarvis.github.io/OpenJarvis/install.ps1 | iex`). یا از سورس:
```bash
git clone https://github.com/open-jarvis/OpenJarvis.git && cd OpenJarvis
uv sync --extra server
uv run maturin develop -m rust/crates/openjarvis-python/Cargo.toml
```
مدل را بگیرید، مثلاً `ollama pull qwen3.5:9b`.

## قدم ۲ — امن‌کردن: فقط متن، بدون ابزار
OpenJarvis می‌تواند خودش هم کار کند (جستجوی وب، حافظه، مهارت‌ها). جارویس ۲ باید **فقط متن بنویسد**. این را در `~/.openjarvis/config.toml` بگذارید:
```toml
[server]
agent = "simple"          # بدون ابزار. حالت پیش‌فرض orchestrator می‌تواند جستجوی وب بزند.

[agent]
default_agent = "simple"
context_from_memory = false

[skills]
enabled = false

[tools.mcp]
enabled = false

[channel]
enabled = false

[learning.spec_search]
enabled = false
```
دکمهٔ «Test connection» در صفحهٔ جارویس اگر agent چیزی غیر از `simple` باشد هشدار می‌دهد.

## قدم ۳ — کلید و روشن‌کردن سرور
```bash
jarvis auth generate-key                     # کلیدی مثل oj_sk_… می‌دهد — محرمانه نگه دارید
export OPENJARVIS_API_KEY=oj_sk_…            # از این به بعد سرور «Authorization: Bearer <key>» می‌خواهد
jarvis serve --host 127.0.0.1 --port 8000    # فقط روی همین دستگاه؛ قدم ۴ آن را امن منتشر می‌کند
```

## قدم ۴ — دسترسی برنامه به سرور (فقط HTTPS)
برنامه روی Cloudflare است، پس باید از اینترنت به سرور شما برسد. پورت ۸۰۰۰ را روی مودم باز **نکنید**. از **Cloudflare Tunnel** استفاده کنید:
۱. روی همان دستگاه `cloudflared` را نصب کنید. در Cloudflare: **Zero Trust → Networks → Tunnels → Create a tunnel**؛ یک نام مثل `jarvis2.yourcompany.com.au` را به `http://localhost:8000` وصل کنید.
۲. محافظت: **Zero Trust → Access → Applications → Add → Self-hosted** برای همان نام، با سیاست **Service Auth** و یک **service token**. مقدار Client ID و Client Secret را نگه دارید.

جارویس آدرس `http://` را (جز `localhost`) قبول نمی‌کند، چون داده‌ها به این آدرس می‌رود.

## قدم ۵ — به برنامه بگویید
این‌ها را در GitHub به‌عنوان secret بگذارید و یک بار **Actions → Run workflow** بزنید (`docs/GO-LIVE-FA.md`):

| نام | مقدار |
|---|---|
| `JARVIS_OPENJARVIS_URL` | `https://jarvis2.yourcompany.com.au` |
| `JARVIS_OPENJARVIS_API_KEY` | کلید قدم ۳ |
| `JARVIS_OPENJARVIS_MODEL` | مثلاً `qwen3.5:9b` (اگر نگذارید، اولین مدل فهرست سرور استفاده می‌شود) |
| `JARVIS_OPENJARVIS_ACCESS_ID` و `JARVIS_OPENJARVIS_ACCESS_SECRET` | توکن قدم ۴ (فقط اگر Cloudflare Access گذاشتید) |

## قدم ۶ — انتخاب و آزمایش
در **Owner → Jarvis** گزینهٔ **Jarvis 2** را انتخاب کنید و **Test connection** را بزنید. باید پیام «Jarvis 2 answered in … ms» ببینید، بدون هشدار.
بعد بپرسید «What's the news?». اگر سرور خاموش یا در دسترس نباشد، جارویس همین را می‌گوید و در حالت ساده جواب می‌دهد — هرگز بی‌صدا از جارویس ۱ استفاده نمی‌کند.

## چه چیزی آزمایش شده و چه چیزی نه
جارویس ۲ بر اساس مستندات و سورس سرور OpenJarvis نوشته شده (`POST /v1/chat/completions` با `model`، `messages`، `temperature`، `max_tokens`، `stream`؛
`GET /health` و `/v1/models` و `/v1/info`؛ کلید Bearer از `OPENJARVIS_API_KEY`) و با یک سرور ساختگی آزمایش شده. **روی یک سرور واقعی OpenJarvis در این پروژه اجرا نشده**؛
اولین آزمایش واقعی همان دکمهٔ **Test connection** است. سرور OpenJarvis «JSON schema» نمی‌گیرد؛ پس جارویس شکل جواب را در دستورها می‌نویسد، JSON را از متن بیرون می‌کشد،
اگر خراب بود یک بار دوباره می‌پرسد و دقیقاً مثل Claude اعتبارسنجی می‌کند.
