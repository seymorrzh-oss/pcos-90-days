# PCOS 90 Days — V1.4

纯前端、localStorage 驱动的 90 天 PCOS 生活方式管理 Dashboard。

## 本版更新

- PCOS 生活方式记录与「饼饼服药记录」正式拆分。
- 移除 PCOS 内所有优思明卡片、周期、22:00 打卡、撤销和补记入口。
- 旧数据库中的 `pills` 数据不会被主动清空，但 PCOS 不再读取或操作它。
- 新增睡眠记录：小时 + 分钟、可选备注、当天记录、历史补记、重新记录及长按删除。
- 新增设备本机时间 21:00 开放的「今日分析」，无需刷新即可自动解锁。
- 今日分析包含彩色模块：今日概览、饮食结构、运动、体重、睡眠和身体状态。
- 今日分析按日期保存在 `dailyAnalyses`，当天数据变化后可以重新分析。
- 身体状态支持当天展示、历史补记和长按删除。
- 首页新增按日期查询的历史记录卡片，支持“昨天 / 今天”快捷切换，并集中查看饮食、运动、睡眠、体重、身体状态及已保存的当日分析。
- 保留原有本地食物数据库、自然数量解析和热量区间估算。
- 饮食录入新增可折叠的手动热量与分析：支持最低/最高 kcal、单一 kcal、分析备注及估算来源。
- 手动热量优先于本地食物库结果；饮食记录可再次编辑，21:00 今日分析也会优先汇总手动数据。
- 永久存储 key 继续固定为 `pcos90-data`。
- 保留一次性旧版迁移、稳定 fingerprint、删除 tombstone 和 JSON 合并导入。

## 数据兼容

旧数据缺少以下字段时会自动初始化为空数组，不覆盖现有记录：

- `sleeps`
- `dailyAnalyses`
- `deleted`

现有 `settings`、`weights`、`foods`、`workouts`、`body` 等数据继续保留。程序不会清空 localStorage，也不会重新扫描已经完成迁移的旧 key。

## 备份

首页继续提供 JSON 导出和合并导入。导入时会尊重 `deleted` tombstone，已明确删除的记录不会自动恢复。

## 文件

- `index.html`
- `style.css`
- `app.js`
- `README.md`

## 建议 commit message

`feat: separate medication tracking and add sleep daily analysis`
