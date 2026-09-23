# PCOS 90 Days V1.2

## 更新
- 本机时间：实时日期、星期、HH:mm:ss，每秒更新。
- 优思明：每天 **22:00（设备本机时间）后**才开放打卡，之前按钮置灰，并显示倒计时；停药 7 天自动禁用。
- 饮食：输入实际食物和份量后，网页用内置食物库自动估算 kcal 区间并分析饮食结构。
- 支持“可乐没喝 / 未喝”等备注，尽量按实际摄入计算。
- 继续支持体重、运动、身体状态、本地 localStorage 保存。

## 关于真正的 ChatGPT 式饮食分析
当前 GitHub Pages 是纯静态网页，因此 V1.2 使用**离线本地分析器**。它无需 API、免费且不会暴露密钥。

如果把 OpenAI API Key 直接写进 `app.js`，访问网页的人都能看到并盗用，所以不能这样做。未来若需要真正的 AI 对话分析，应增加安全后端/Serverless Function，由后端保存密钥。

## GitHub
上传并覆盖 `index.html`、`style.css`、`app.js`、`README.md`。

Commit:
`feat: add 22:00 pill lock, local clock and food analysis`
