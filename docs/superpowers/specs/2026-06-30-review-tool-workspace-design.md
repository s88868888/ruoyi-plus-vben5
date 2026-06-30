# AI 审核工具工作台设计

日期：2026-06-30
项目：`apps/web-antd`

## 目标

新增一个独立的 AI 审核工具工作台路由，不改动现有步骤条向导页。

- 现有页面继续保留：`/review/tool/compare`、`/review/tool/audit`、`/review/tool/redact`。
- 新增页面：`/review/tool/workspace`。
- 新页面首屏居中展示三个不同颜色的工具盒子：附件对比、内容审核、文件脱敏。
- 点击工具盒子后，在当前页面内切换到对应工作台，不跳转到现有步骤条页面。

## 使用流程

### 工具入口

`/review/tool/workspace` 首屏展示三个工具盒子：

- 附件对比
- 内容审核
- 文件脱敏

点击盒子后进入对应工作台。工作台提供返回入口，可回到三个盒子的选择页。

### 附件对比

进入后直接展示预览器式工作台：

- 左侧上传基准文件。
- 右侧上传对比文件。

右上角操作：

- 导入工程文件
- 导出工程文件
- 开始对比；已有任务后显示重新对比

点击开始对比后，通过 `toolCreateAndExecute` 创建 `ATTACHMENT_COMPARE` 任务，轮询 `getToolResult`。任务执行中展示 loading，成功后使用现有 `FileDiffViewer` 展示对比结果。

### 内容审核

进入后展示单文档工作台：

- 中间上传待审核文件。
- 选择规则。
- 可填写基准值；基准值允许为空。

右上角操作：

- 导入工程文件
- 导出工程文件
- 开始审核；已有任务后显示重新审核

点击开始审核后，创建 `CONTENT_AUDIT` 任务，轮询 `getToolResult`。任务执行中展示 loading，成功后使用现有 `ContentAuditViewer` 展示审核结果。

### 文件脱敏

文件脱敏与内容审核使用相同的单文档工作台结构：

- 中间上传待脱敏文件。
- 选择关注点。

右上角操作：

- 导入工程文件
- 导出工程文件
- 开始脱敏；已有任务后显示重新脱敏

点击开始脱敏后，创建 `FILE_REDACT` 任务，轮询 `getToolResult`。任务执行中展示 loading，成功后使用 `ContentAuditViewer` 的脱敏模式展示结果。

## 技术设计

新增页面文件：

- `apps/web-antd/src/views/review/tool/workspace/index.vue`

复用现有组件和接口：

- `SingleFileUpload`：文件上传和 Word 转 PDF。
- `StandardPicker`：内容审核规则选择。
- `ReferenceEditor`：内容审核基准值编辑。
- `FocusPointPicker`：文件脱敏关注点选择。
- `FileDiffViewer`：附件对比结果展示。
- `ContentAuditViewer`：内容审核和文件脱敏结果展示。
- `toolCreateAndExecute`、`getToolResult`：任务创建和轮询。
- `reviewTaskExport`、`reviewTaskImport`：工程文件导出和导入。

结果查看器主体尽量不改。新工作台只在外层编排上传、规则/关注点选择、任务启动、轮询、导入导出和结果展示，避免影响现有预览器代码。

## 工程文件导入导出

三个工作台都展示导入工程文件、导出工程文件按钮。

- 导入工程文件：选择 `.zip` 工程包，调用 `reviewTaskImport`，成功后在当前工作台打开导入后的第一个任务结果。
- 导出工程文件：当前工作台已有任务后，调用 `reviewTaskExport([taskId])` 下载 zip。
- 当前没有任务时点击导出，提示“请先完成一次任务后再导出工程文件”。

## 轮询和异常处理

- 任务未完成时每 5 秒轮询一次。
- 页面卸载或缓存停用时停止轮询。
- `SUCCESS` 展示对应查看器。
- `FAIL` 展示失败状态，并保留重新对比、重新审核或重新脱敏入口。
- 上传失败、未选择规则、未选择关注点、文件缺失等场景使用 Ant Design Vue `message` 提示。

## 路由

新增路由路径必须可访问：

- `/review/tool/workspace`

当前应用主要使用后端菜单动态路由，因此新页面也需要支持后端菜单组件路径：

- `review/tool/workspace/index`

任务列表顶部“附件对比 / 审核分析 / 文件脱敏”的新建入口改为进入新工作台。历史任务查看继续保持现有跳转逻辑，仍然使用已有向导结果页打开查看器。

## 验证

手动验证：

- 打开 `/review/tool/workspace`。
- 三个工具盒子能正常进入对应工作台，并能返回入口页。
- 附件对比：未上传两个文件时不能开始；上传后可开始对比；执行中展示 loading；成功后展示 `FileDiffViewer`。
- 内容审核：未上传文件或未选择规则时不能开始；成功后展示 `ContentAuditViewer`。
- 文件脱敏：未上传文件或未选择关注点时不能开始；成功后展示脱敏模式。
- 无任务时导出工程文件给出提示；有任务后能下载工程包。
- 导入 `.zip` 工程包后能打开导入任务结果。

自动验证：

- 运行本项目已有的类型检查或构建命令。
- 如项目提供 lint 命令，运行与本次改动相关的前端 lint。
