## FindThePath 素材生成 Prompts（极简手绘风）

极简手绘风很适合本项目：可读性强、成本低、风格统一，还能把“旋转连通”的信息表达得更清楚。

### 0. 通用风格设定（所有素材都带上）

**风格关键词（正向）**
- minimalist hand-drawn, doodle line art, simple shapes, clean negative space
- slightly wobbly ink outline, subtle paper texture, flat pastel fills
- high readability, game UI icon, 2D, front view, no perspective distortion

**统一规格**
- 透明背景：background transparent / isolated on transparent background
- 线条：深灰或墨黑，线宽一致（建议等效 6–10px@256px）
- 阴影：不要真实投影，可用极轻微的“手绘描边阴影/浅灰投影”
- 色板建议：墨黑 #2B2B2B；底色米白 #F5F1E8；点缀绿 #2E6B3F；点缀黄 #F2C14E；警示红 #D9544D

**负向关键词（统一负向）**
- photorealistic, 3D render, heavy gradient, glossy, metallic, complex background
- tiny details, cluttered, text, watermark, logo, jpeg artifacts

### 1. 导出要求（给美术/生成器）

- 输出：PNG（透明背景）
- 推荐尺寸：
  - Tile：256×256（或 512×512）
  - Marker/Car：128×128（或 256×256）
  - UI 按钮：256×96（或 512×192）
- 锚点：居中（图形主体留安全边距，四周至少 10% 空白）

### 2. Tile（地块）Prompts

说明：Tile 图片只画“轨道图形”，底板/高亮/占用态可以由程序或额外层控制；如果你希望底板也在图里，就把 prompt 里的 “no tile border” 去掉，改成 “with a simple rounded square tile base”.

#### 2.1 Tile I（直线）
Prompt：
> minimalist hand-drawn tile icon, a straight road/pipe track connecting up and down, centered, thick doodle ink outline, flat light fill, clean negative space, no tile border, transparent background

#### 2.2 Tile L（转角）
Prompt：
> minimalist hand-drawn tile icon, an L-shaped road/pipe track connecting up and right, centered, thick doodle ink outline, flat light fill, clean negative space, no tile border, transparent background

#### 2.3 Tile T（三通）
Prompt：
> minimalist hand-drawn tile icon, a T-junction road/pipe track connecting up, left, and right, centered, thick doodle ink outline, flat light fill, clean negative space, no tile border, transparent background

#### 2.4 Tile X（四通）
Prompt：
> minimalist hand-drawn tile icon, a cross intersection road/pipe track connecting up, right, down, and left, centered, thick doodle ink outline, flat light fill, clean negative space, no tile border, transparent background

#### 2.5 Block（不可通行格）
Prompt：
> minimalist hand-drawn tile icon, a solid dark stone block with a simple chalk X mark, centered, thick doodle outline, flat fill, clean negative space, transparent background

### 3. Marker（起点/终点）Prompts

#### 3.1 Start 标记（建议：旗子/车库门）
Prompt（旗子）：
> minimalist hand-drawn game marker icon, a small start flag, thick doodle ink outline, flat pastel fill, high readability, transparent background

Prompt（车库门）：
> minimalist hand-drawn game marker icon, a small garage entrance for start, thick doodle ink outline, flat pastel fill, high readability, transparent background

#### 3.2 Goal 标记（建议：小房子/终点旗）
Prompt（小房子）：
> minimalist hand-drawn game marker icon, a small cozy house as goal, thick doodle ink outline, flat pastel fill, high readability, transparent background

Prompt（终点旗）：
> minimalist hand-drawn game marker icon, a finish flag, thick doodle ink outline, flat pastel fill, high readability, transparent background

### 4. Car（车辆）Prompts

建议做“箭头小车”：形状本身就有方向性，旋转表现更直观。

Prompt（箭头小车）：
> minimalist hand-drawn top-down car icon shaped like an arrow, chunky doodle outline, flat yellow fill, simple windshield hint, high readability, transparent background

Prompt（纸飞机风）：
> minimalist hand-drawn paper airplane icon, doodle outline, flat pastel yellow fill, high readability, transparent background

### 5. UI（按钮/面板）Prompts

#### 5.1 通用按钮底（可复用）
Prompt：
> minimalist hand-drawn UI button, rounded rectangle, doodle ink outline, flat light fill, subtle paper texture, clean, transparent background

#### 5.2 图标：重开（刷新箭头）
Prompt：
> minimalist hand-drawn UI icon, refresh arrow, doodle ink outline, flat fill, high readability, transparent background

#### 5.3 图标：返回（左箭头）
Prompt：
> minimalist hand-drawn UI icon, back arrow pointing left, doodle ink outline, flat fill, high readability, transparent background

#### 5.4 面板底（结算/提示）
Prompt：
> minimalist hand-drawn UI panel, rounded rectangle card, doodle ink outline, flat warm paper fill, subtle paper texture, clean, transparent background

### 6. 生成器参数建议（可选）

你用什么模型都行，下面是常用两类的写法。

#### 6.1 Midjourney（v6）示例
- Tile I：
  - `/imagine prompt: [2.1 的 prompt] --ar 1:1 --style raw --v 6 --s 150`
- Button：
  - `/imagine prompt: [5.1 的 prompt] --ar 8:3 --style raw --v 6 --s 150`

#### 6.2 Stable Diffusion / SDXL 示例
- 建议：
  - Steps：30–40
  - CFG：4–6
  - Sampler：DPM++ 2M Karras
  - 输出：512×512（Tile），512×192（按钮）
- Negative：使用“统一负向”那一段即可

### 7. 命名建议（导入项目时方便管理）

- tile_I.png / tile_L.png / tile_T.png / tile_X.png
- tile_block.png
- marker_start.png / marker_goal.png
- car_arrow.png
- ui_btn_base.png / ui_icon_restart.png / ui_icon_back.png / ui_panel.png
