# 霓虹突袭（手机网页游戏）

## 本地运行

```powershell
cd D:\apple\xiaoyouxi\web-game
python -m http.server 8080
```

访问 `http://localhost:8080`。

## 当前版本特点

- 视角改为后方跟随 + 略微俯视
- 每关路程加长，推进到指定距离后才出现 Boss
- 路上会出现二选一随机强化门：生命 / 射速 / 伤害 / 子弹数量
- 通关后三选一改为武器构筑（优先出现新武器）+ 武器技能强化
- 武器包含：速射机枪、激光炮、镭射枪（各有独立主动技能）
- 顶部只显示 Boss 血条（Boss 出场后出现）
- 角色生命改为底部数字显示
- 保留第 5 关 20% 血量二阶段终极狂暴

## Netlify 部署

1. 打开 [https://app.netlify.com/](https://app.netlify.com/)
2. 选择 `Add new site` -> `Deploy manually`
3. 上传 `D:\apple\xiaoyouxi\web-game-deploy.zip` 或 `D:\apple\xiaoyouxi\web-game` 目录
