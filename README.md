<!--
 * @LastEditors: jizai ggmm9468@gmail.com
 * @Date: 2024-12-24 16:51:45
 * @LastEditTime: 2024-12-24 16:54:04
 * @FilePath: /sina_liked_it/README.md
 * @Description: 
-->
# 微博自动点赞扩展

一个用于自动给新浪微博点赞的 Chrome 浏览器扩展。

## 功能特点

- 自动识别并点赞微博内容
- 智能检测已点赞内容，避免重复操作
- 自动滚动页面寻找新的点赞内容
- 可配置的点赞数量限制（当前设置为50个）
- 合理的操作间隔（2秒），避免触发反作弊机制
- 可随时开始/停止点赞操作
- 实时显示点赞进度
- 智能错误处理和重试机制

## 安装方法

1. 下载本项目的所有文件到本地文件夹
2. 打开 Chrome 浏览器，进入扩展管理页面（chrome://extensions/）
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择包含项目文件的文件夹

## 使用说明

1. 登录新浪微博网站（https://weibo.com/）
2. 点击 Chrome 工具栏中的扩展图标
3. 点击"开始点赞"按钮开始自动点赞
4. 需要停止时点击"停止点赞"按钮

## 配置说明

在 content.js 中可以修改以下参数：
- `MAX_LIKES`：最大点赞数量（默认50个）
- `WAIT_INTERVAL`：点赞间隔时间（默认2000毫秒）

## 项目结构

```
├── manifest.json      # 扩展配置文件
├── popup.html        # 扩展弹窗界面
├── popup.js         # 弹窗交互逻辑
├── content.js       # 主要功能实现
└── README.md        # 项目说明文档
```

## 注意事项

1. 请合理使用本扩展，避免过于频繁的操作
2. 建议不要将点赞间隔设置得过短，以免触发微博的安全机制
3. 如果遇到点赞失败，可能是因为操作太频繁，建议增加等待时间
4. 使用本扩展时请遵守微博平台的使用规则

## 技术实现

- 使用 Chrome Extension Manifest V3
- 使用原生 JavaScript 实现
- 采用异步操作处理点赞逻辑
- 使用 MutationObserver 监听页面变化
- 实现智能滚动和按钮可见性检测

## 开发调试

1. 在 Chrome 开发者工具中查看 Console 面板可以看到详细的运行日志
2. 扩展会显示每个操作的状态和进度
3. 出现错误时会在控制台显示详细信息

## 更新日志

### v1.0.0 (2024-12-24)
- 初始版本发布
- 实现基本的自动点赞功能
- 添加点赞数量限制和间隔控制
- 实现自动滚动和按钮可见性检测

## 许可证

MIT License

## 作者

- 作者：jizai
- 邮箱：ggmm9468@gmail.com

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。