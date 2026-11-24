# 附录　复现材料 {#appendix-reproduction}

讲义和课件只写实验设置与结果：环境、算法、参数、独立重复的次数，以及报告的均值与区间。产生这些数字与图的程序、输入数据和输出文件集中列在本附录，按章排列；各章正文末的尾注指向这里对应的一节。

一个数字能否复现，取决于它是怎样得到的。正文里的数大致有四种来源：已知模型上的精确计算，随机模拟，正文中的推导，以及所引文献；另有少数标“示意”或“预期”的数。前两种由本课的程序产生，列在各章的表中；其余几种在各章表前的说明里交代去处，不列入表中。精确计算不含随机性，重跑应得到逐位相同的数；随机模拟在同一种子下可以重现，换种子后只应在报告的区间内变动。

## 怎样使用本附录 {#how-to-use}

**表的读法。** 每章一张表，按章内顺序排列，每行对应正文里的一处结果。

| 列 | 内容 |
|---|---|
| 位置 | 讲义的节号或小节标题；只在课件里出现的结果写页标签。 |
| 结果 | 正文中出现的数字或图，只写简称。 |
| 设置 | 与正文相同的实验设置：环境、算法、参数、独立重复次数。 |
| 程序 | 产生该结果的本课程序。 |
| 数据与输出 | 程序读取的数据和写出的结果文件，正文里的数取自这些文件。 |

一个程序支撑多处结果时，表中合为一行。表中没有列出的模拟结果，程序暂未收入本附录。

**哪些数字没有程序。** 下面三类结果不列入表中：

- 由正文推导直接算出的数；
- 标“示意”或“预期”的数；
- 引自文献的数。

**运行环境。** 需要 Python 3.10 或更新版本。多数程序只依赖 NumPy（≥ 2.0）与 Matplotlib（≥ 3.8），见课程目录下的 `requirements.txt`。策略梯度与 SAC 的神经网络训练另需 PyTorch（≥ 2.2），见 `requirements-samples.txt`。

在课程目录下运行，例如：

```sh
python -m pip install -r requirements.txt
python demos/sample14_mctd.py
```

::: {.pitfall}
多数程序把结果写回 `assets/` 下的对应目录，会覆盖课程正在使用的文件。复现时应在课程目录的副本中运行，再把新结果与原文件对照。少数程序接受 `--output-dir`，可以把结果写到别处。
:::

**随机性与区间。** 正文所说的“独立重复 $N$ 次”，指用 $N$ 个不同的随机数种子各跑一次完整的模拟。种子写在程序里或由命令行参数给定，同一环境下重跑应得到相同的数；NumPy 或 PyTorch 版本不同时，末几位可能有出入。正文报告的区间是 $95\%$ 区间；用正态近似还是 $t$ 分布，由程序决定，配对比较的标准误由各对差值算出。

**外部代码与公开数据。** 有些图或数字用到原论文作者的实现或公开的交互记录。这些材料不属于本课程序，列在各章表后，按出处取得。

**第三部分的四区仓库。** 第 15–25 章各有一行“阶梯实验”，共用同一个世界：四区仓库（demos/crl_ladder_world.py）。智能体在一个 lifetime 里只在开始时复位一次。各章按需要打开世界中的某种变化（支付规律切换、支付延迟、局部观测、指示灯含义翻转、打滑率漂移、北门关闭再重开等），或让世界保持固定，然后在同一个底座学习器上加入这一章讲的一种能力，比较三种学习器：没有这种能力、由设计者给定、从经验中学到。底座在第 15–16 章是折扣 Q 学习，第 17 章起是差分 Q 学习，第 21–22、25 章另用选项学习器或探测学习器；每行只加一种能力，是单项的消融比较。成绩是 lifetime 奖励率，即全部奖励除以步数，学习期间的损失也计在内。同一种子下各学习器共用一条世界随机数，比较按种子配对，区间由配对差算出。正式运行的种子从 100 起编号（命令里的 `--seed0 100`），`--seeds N` 即种子 100 至 $99+N$；省去 `--seed0` 时从 0 起，得到的是另一组独立运行，均值应在区间内吻合，逐种子的数不同。11-22 用现行程序按 0–19 号种子重跑第 16、18、20、23 章，各学习器均值与正式记录之差都在 1.6 个标准误以内。第 23 章 13 种设置在新种子下一齐偏低 0.0011–0.0022，约一个标准误；差值相近的设置（如 $\alpha=0.03$ 与 $\alpha=0.3$）先后可能互换。

表中所说的“天花板”是知道全部规律、仍以 $\varepsilon=.05$ 随机探测时能达到的最好奖励率，由相对值迭代精确算出；它不扣学习期的损失，是上界，不一定达得到；第 18 章的局部观测没有精确值，用全观测的值代替，是更松的上界。正式运行每种学习器 200 万步，种子数写在各章的运行命令里，耗时较长；先用较少的种子和步数（例如 `--seeds 5 --steps 300000`）试跑，可以检查程序是否正常。世界本身的独立检查（手算、枚举与独立实现互查）由 demos/crl_ladder_world_checks.py 完成。

**每章的说明。** 每章表前的一段说明这一章哪些数来自程序、哪些由推导或文献给出，以及复现时要注意的假设与限制；表后的运行命令重做表中由本课程序产生的结果。课程的分章代码包按各章表中列出的程序与运行命令整理。

## 第 1 章　强化学习的基本问题 {#ch-01}

本章的数字有两种来源。提示任务的学习曲线、目标比较图和两步任务的两组图由本课的程序产生：提示任务是随机模拟，独立重复 20 次；两步任务按指定的行动序列运行，不含随机抽样。取鱼例的数值是确定性计算，由一个只在终端输出的小程序复算，用来核对正文的算术。

课件中的其余图取自所引文献或由 TikZ 直接绘制，不依赖本课的程序。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 1.2 节“算例：提示任务”（课件 `ch01-cue-history`） | 提示消失后的记忆示意图；只看当前画面的成功率上限 1/2，保留提示时可达 1 的学习曲线 | 本课的模拟：两步提示任务，终止动作价值更新 $Q\leftarrow Q+\alpha(R-Q)$，$\alpha=.1$，$\varepsilon=.1$，每次运行 2000 回合，每 100 回合对两种提示做精确贪心评价，独立重复 20 次；一位记忆由实验给定，不是学得的 | [demos/problem_foundations.py](../demos/problem_foundations.py) | [assets/v5/cue-memory.png](../assets/v5/cue-memory.png)、[assets/v5/cue-learning.png](../assets/v5/cue-learning.png)、[demos/05-results/cue-learning.csv](../demos/05-results/cue-learning.csv)、[demos/05-results/problem-foundations.json](../demos/05-results/problem-foundations.json) |
| 1.3 节“回报与目标” | 取 $\gamma=.30$：单趟走右 1.2；持续重复时走左约 1.429、走右 1.319；六个环境步内的总数 6 与 12 | 确定性计算，无训练：左路一步得 1，右路两步得 4，取鱼后立即回到起点；默认 $\gamma=3/10$，计数窗口 6 步；单趟值 $1,4\gamma$，重复值 $1/(1-\gamma)$ 与 $4\gamma/(1-\gamma^2)$ | [demos/average_reward_clock.py](../demos/average_reward_clock.py) | 只在终端输出，不写文件 |
| 1.4 节“探索与经验怎样改变选择” | 两次实际执行的路线；执行 L、R 两回合后 $Q(L)=1$、$Q(R)=3.6$ | 确定性两步任务，$\gamma=.9$，指定的行动序列，不含随机抽样 | [demos/v18_problem.py](../demos/v18_problem.py) | [assets/v18-problem/experience-policy.png](../assets/v18-problem/experience-policy.png)、[assets/v18-problem/results.json](../assets/v18-problem/results.json) |
| 第 1 章补充阅读“回合、折扣与平均奖励目标” | 奖励序列 $1,1,1,\ldots$ 与 $0,3,0,3,\ldots$ 的比较：$\gamma>1/2$ 时后者折扣回报更高，长期奖励率 1 与 1.5 | 解析计算，无训练 | [demos/problem_foundations.py](../demos/problem_foundations.py) | [assets/v5/reward-objectives.png](../assets/v5/reward-objectives.png)、[demos/05-results/problem-foundations.json](../demos/05-results/problem-foundations.json) |
| 第 1 章补充阅读“策略评价与学习算法评价” | 两条指定行动序列在六个环境步内的总奖励 12 与 8；冻结后的贪心动作 R，回报 3.6 | 确定性两步任务，终止后立即重启，重启不占环境步 | [demos/v18_problem.py](../demos/v18_problem.py) | [assets/v18-problem/learner-rewards.png](../assets/v18-problem/learner-rewards.png)、[assets/v18-problem/results.json](../assets/v18-problem/results.json) |

运行：
```sh
python3 demos/problem_foundations.py
python3 demos/average_reward_clock.py
python3 demos/v18_problem.py
```

## 第 2 章　多臂赌博机 {#ch-02}

本章的结果来自两类程序。模拟程序给出两臂抓取例的选择记录、价值估计与行为比例，梯度赌博机的单次与多次运行，以及 2.4 节 ε-贪心、UCB1 与梯度赌博机的期望伪遗憾曲线；伪遗憾是 4000 次独立运行的平均，表中同时给出标准误。精确计算程序给出机会损失、平方损失、随机停止和常数步长的权重，这些数不含随机性。

梯度赌博机种子 7 的单次运行沿用 demos/classic_v8_foundations.py 的随机数流，两个程序可以逐步对照。十臂试验台按 Sutton 与 Barto §2.3 的设定由本课程序重算，见下表。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 2.1 节“差距与累计遗憾”（课件 `classic-bandit-objective`） | 指定五次选择的均值机会损失，选 A 两次累计 .4 | 精确计算：真值 .4 与 .6，指定行动序列，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/bandit-regret.png](../assets/v18-classic/bandit-regret.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| 2.2 节“增量形式”（课件 `planning-03`）；2.3 节的更新表 | A 的第 5 份奖励为 0：$N$ 由 4 到 5，$Q$ 由 .75 到 .60 | 有限算术核对：增量样本均值与全历史均值一致，程序共 58 项核对，不含训练 | [demos/classic_foundations.py](../demos/classic_foundations.py) | [demos/classic-foundations-results.json](../demos/classic-foundations-results.json) |
| 2.2 节“选读：平方损失与奖励均值”（课件 `classic-v10-mean-objective`） | 总体风险与样本 1、1、0、1 的经验风险曲线，经验最小点 .75 | 解析计算，无训练 | [demos/classic_v10_derivations.py](../demos/classic_v10_derivations.py) | [assets/classic-v10/mean-risk.dat](../assets/classic-v10/mean-risk.dat)、[assets/classic-v10/derivations.json](../assets/classic-v10/derivations.json) |
| 2.2 节“选读：样本均值的无偏条件”（课件 `classic-v8-mean-limit`） | 首次得 0 即停止、否则再取一个样本时（至多两次），样本均值的期望 .375，低于 .5 | 对全部结果枚举的精确计算 | [demos/classic_v9_checks.py](../demos/classic_v9_checks.py) | [assets/v9-classic/checks.json](../assets/v9-classic/checks.json) |
| 2.3 节“实验：$\varepsilon$-贪心的估计轨迹与持续探索”（课件 `v17-bandit-values`、`v17-bandit-behaviour`） | 一次运行中的选择与两动作估计；最近 100 步选 B 的比例，末段均值约 .949 | 本课的模拟：Bernoulli 两臂，成功率 .4 与 .6，$\varepsilon=.1$，零初值，样本均值更新，每次运行 2000 步，独立重复 32 次（种子 0–31），单次运行图取种子 7；阴影为均值的一个标准误 | [demos/v17_bandit.py](../demos/v17_bandit.py) | [assets/v17-bandit/action-value.png](../assets/v17-bandit/action-value.png)、[assets/v17-bandit/behaviour.png](../assets/v17-bandit/behaviour.png)、[assets/v17-bandit/results.json](../assets/v17-bandit/results.json)、[assets/v17-bandit/seed7-trace.csv](../assets/v17-bandit/seed7-trace.csv) |
| 2.3 节“ε-贪心的价值估计与行为概率” | 20、200、2000 次选择后的估计与访问数；2000 次后约 .388 与 .596，$N$ 为 116 与 1884；200 次后选 B 的概率 .95 | 本课的模拟：同一两臂任务，$\varepsilon=.1$，零初值，一次运行，种子 7，2000 步 | [demos/classic_v6_lab.py](../demos/classic_v6_lab.py) | [assets/v6-classic/bandit-estimates.png](../assets/v6-classic/bandit-estimates.png)、[assets/v6-classic/results.json](../assets/v6-classic/results.json) |
| 2.5 节“选读：梯度赌博机的一次运行”（课件 `classic-v8-gradient-behavior`） | 第 2000 次选择前 $\pi(B)\approx.991$，累计奖励均值 .5825；1999 次更新中有 798 次使 $\pi(B)$ 下降；4000 次运行的均值 .986 与另外 8 次单次运行；同程序含 UCB 的完整交互循环 | 本课的模拟：同一两臂任务，梯度赌博机 $\alpha=.1$，基线为过去奖励均值，一次运行，种子 7，2000 步；梯度公式另以枚举期望与有限差分检验 | [demos/classic_v8_foundations.py](../demos/classic_v8_foundations.py)；[demos/ch02_three_rules_regret.py](../demos/ch02_three_rules_regret.py) | [assets/ch02-explore/gradient-runs.dat](../assets/ch02-explore/gradient-runs.dat)、[assets/v8-classic/gradient-bandit.dat](../assets/v8-classic/gradient-bandit.dat)、[assets/v8-classic/results.json](../assets/v8-classic/results.json) |
| 2.6 节正文与“选读：常数步长的长期方差”（课件 `planning-09`、`classic-v8-constant-noise`） | 常数步长的权重与平稳噪声图；最近 5 个奖励的总权重 .40951、.67232、.96875（$\alpha=.1,.2,.5$）；平稳方差比 .05263、.11111、.33333 | 几何级数的精确计算，左图与 20 份样本均值比较 | [demos/v18_classic.py](../demos/v18_classic.py)；[demos/classic_v9_checks.py](../demos/classic_v9_checks.py) | [assets/v18-classic/constant-weights.png](../assets/v18-classic/constant-weights.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json)、[assets/v9-classic/checks.json](../assets/v9-classic/checks.json) |
| 2.4 节“实验：UCB 的对数遗憾”（课件 `ch02-ucb-egreedy-regret`） | ε-贪心、UCB1 与梯度赌博机的期望伪遗憾曲线；约 4000 轮后 UCB1 低于 ε-贪心；$T=10\,000$ 时依次为 107.13、61.77、35.94，标准误不超过 .34；UCB1 的上界 $8\ln T/.2$ 在 $T=10^4$ 处约 368 | 本课的模拟：Bernoulli 两臂，成功率 .4 与 .6，零初值；ε-贪心 $\varepsilon=.1$；UCB1；梯度赌博机 $\alpha=.1$，基线为过去奖励的平均（$\bar R_0=0$）；每种规则独立重复 4000 次，种子 20261121、20261122、20261123；梯度赌博机的种子 7 单次运行沿用 demos/classic_v8_foundations.py 的随机数流 | [demos/ch02_three_rules_regret.py](../demos/ch02_three_rules_regret.py) | [assets/ch02-explore/regret-three-rules.dat](../assets/ch02-explore/regret-three-rules.dat)、[assets/ch02-explore/regret-three-rules.json](../assets/ch02-explore/regret-three-rules.json)、[assets/ch02-explore/gradient-runs.dat](../assets/ch02-explore/gradient-runs.dat) |
| 章末“第 7 次各选谁”（课件 `ch02-bridge-round7`，梯度赌博机一行） | 按先 A 后 B 读入章首记录，第 7 次选 B 的概率 .4767，A .5233；A、B 记录交错的 15 种顺序下，选 B 的概率在 .4488 与 .5261 之间 | 精确计算：偏好从 0 出发，$\alpha=.1$，基线为过去奖励的平均（$\bar R_0=0$），按算法 2.3 逐条更新；无随机数 | [demos/ch02_round7_gradient.py](../demos/ch02_round7_gradient.py) | 只在终端输出，不写文件 |
| 2.3 节“贪心的单向纠错”（课件 `ch02-greedy-asymmetry`） | 最后千轮（第 9001–10000 轮）多数选 A 的运行比例：章首记录 .37，B 再失败一次 .80，两臂从零开始 .40，各试一次后贪心 .29 | 本课的模拟：Bernoulli 两臂，成功率 .4 与 .6，纯贪心，样本均值，平局随机；独立运行 20000 次，每次 10000 轮，四行依次用种子 1–4；另给平局取 A 的对照 | [demos/ch02_greedy_lockin.py](../demos/ch02_greedy_lockin.py) | 只在终端输出，不写文件 |
| 2.3 节“乐观初值”（课件 `ch02-optimistic-exp`，表前三行） | 乐观初值 2 配常数步长 .1：最后千轮多数选 A .004，遗憾 16.0、39.1（$T=10^3$、$10^4$）；乐观初值配样本均值：.28，57.0、564；零初值配常数步长 .1：.40，79.9、798 | 本课的模拟：同一两臂任务，贪心，平局随机；遗憾为 .2 乘 A 的期望选择次数；独立运行 20000 次，三行依次用种子 20261121、20261122、20261123；程序参数为轮数，默认 $10^5$ | [demos/ch02_optimistic_table.py](../demos/ch02_optimistic_table.py) | 只在终端输出，不写文件 |
| 2.3 节“实验：十臂试验台”（课件 `classic-v6-bandit-state`） | 末 100 步选中最优臂的比例：$\varepsilon=0$ 约 .36，$\varepsilon=.01$ 约 .59，$\varepsilon=.1$ 约 .80；逐步平均奖励 | 按 Sutton 与 Barto §2.3：$q_*(a)\sim N(0,1)$，奖励 $N(q_*(A_t),1)$，零初值，样本均值，平局随机；独立运行 2000 次，每次 1000 步，种子 20261121 | [assets/ch02-explore/tenarm_sim.py](../assets/ch02-explore/tenarm_sim.py) | [assets/ch02-explore/tenarm-optimal.dat](../assets/ch02-explore/tenarm-optimal.dat)、[assets/ch02-explore/tenarm-reward.dat](../assets/ch02-explore/tenarm-reward.dat) |

外部代码（出处）：无。十臂试验台的设定取自 Sutton 与 Barto 第 2 版 §2.3、图 2.2，曲线由本课程序重算；UCB 分数图与观测示意图是课件 TikZ 页面的截图或外部教程中的插图，均不依赖本课的程序。

运行：
```sh
python3 demos/v17_bandit.py
python3 demos/classic_v6_lab.py
python3 demos/classic_v8_foundations.py
python3 demos/ch02_three_rules_regret.py
python3 demos/ch02_greedy_lockin.py
python3 demos/ch02_optimistic_table.py 10000
python3 demos/ch02_round7_gradient.py
python3 assets/ch02-explore/tenarm_sim.py
python3 demos/classic_foundations.py
python3 demos/classic_v9_checks.py
python3 demos/classic_v10_derivations.py
python3 demos/v18_classic.py
```

## 第 3 章　有限马尔可夫决策过程 {#ch-03}

本章的泥地导航图、价值表、有限期限表和转移矩阵由本课的程序按已知模型精确计算，结果与随机数无关。只有抽样轨迹图用到随机抽样；这些轨迹用来展示模型生成的经验，不进入任何价值计算。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 3.1 节“算例：泥地的组成”（课件 `v17-classic-mdp-objects`） | 泥地地图与五元组的对应，同一动作两条后果的概率、奖励与折扣 | 共用泥地任务：S4 打滑概率 .9，$\gamma=.9$，进入 G 得 1；精确模型，无训练；课件图已改用 TikZ 重画，概率与奖励由 checks.json 核对 | [demos/v17_classic.py](../demos/v17_classic.py) | [assets/v17-classic/checks.json](../assets/v17-classic/checks.json)；原图 [assets/v17-classic/mdp-objects.png](../assets/v17-classic/mdp-objects.png) 不再进课件 |
| 3.2 节“回合的长度”（课件 `course15-mdp-episodes`） | 两条策略的路线图；旧策略下的实际抽样轨迹 | 同一任务；旧策略 $\pi_0$（S7 向上）抽样 6 个回合，随机数种子 7，仅作演示 | [demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course15-mdp-dp/routes.png](../assets/course15-mdp-dp/routes.png)、[assets/course15-mdp-dp/sample-paths.png](../assets/course15-mdp-dp/sample-paths.png)、[assets/course15-mdp-dp/sample-trajectories.csv](../assets/course15-mdp-dp/sample-trajectories.csv) |
| 3.3 节“算例：随机策略的一步备份”（课件 `course15-mdp-branches`） | 随机策略下先选动作、再按环境分支加权的概率树 | 精确模型，无训练 | [demos/v17_classic.py](../demos/v17_classic.py) | [assets/v17-classic/probability-tree.png](../assets/v17-classic/probability-tree.png)、[assets/v17-classic/checks.json](../assets/v17-classic/checks.json) |
| 3.3 节“状态价值与 Bellman 期望方程” | 回报的概率与等待长度 | 精确模型：S4 每步成功概率 .1 的几何分布，无训练 | [demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course15-mdp-dp/return-distribution.png](../assets/course15-mdp-dp/return-distribution.png) |
| 3.4 节“算例：改动一格的策略”（课件 `ch03-policy-change-values`） | $\pi_0$ 与 $\pi_1$ 的价值表 .900、1.000、.810、.526、.729、.656、.474；$\pi_1$ 下 S7 为 .590，变化 +.117；$q_{\pi_0}(\mathrm{S7},\leftarrow)=.59049$ | 精确模型下的线性方程求解与迭代评价；另对全部 $4^7=16384$ 条确定性策略枚举核对最优性 | [demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course15-mdp-dp/results.json](../assets/course15-mdp-dp/results.json) |
| 3.4 节“算例：同一起点的预测与控制”（课件 `vision-prediction-control`） | 同一 S7 的两种首动作对应的两个动作价值，以及状态价值按策略概率的平均 | 精确模型，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/policy-vq.png](../assets/v18-classic/policy-vq.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| 3.5 节“有限期的最优首动作”（课件 `course15-mdp-finite-horizon`） | S7 首动作的有限期限价值：$h=2$ 为 .090000 与 0，$h=4$ 为 .221949 与 .072900，$h=6$ 为 .308521 与 .590490；最佳首动作由上变为左 | 精确模型下按剩余步数 $h$ 逐层递推 | [demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course15-mdp-dp/horizon-maps.png](../assets/course15-mdp-dp/horizon-maps.png)、[assets/course15-mdp-dp/finite-horizon.csv](../assets/course15-mdp-dp/finite-horizon.csv)、[assets/course15-mdp-dp/results.json](../assets/course15-mdp-dp/results.json) |
| 3.3 节“Bellman 方程的矩阵形式”（课件 `course15-mdp-matrix`） | 旧策略的非终止转移矩阵与奖励向量：S4 以 .9 留在自身，期望即时奖励 .1 | 精确模型，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/mdp-matrix.png](../assets/v18-classic/mdp-matrix.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| 本章小结（课件 `ch03-conclusion`） | S4 的 DP 目标 .505、TD 目标 .45、首次访问 MC 目标 .81；$v_{\pi_0}(\mathrm{S4})=10/19$ | 旧估计 .5，两次打滑后成功的一条轨迹；程序默认 `--old 0.5`、`--alpha 0.2` | [demos/mud_prediction_lens.py](../demos/mud_prediction_lens.py) | 只在终端输出，不写文件 |
| 3.6 节；课件 `vision-objective-choice` | 取鱼例：$\gamma=.30$ 时单趟走右 1.20；六个环境步内总数 6 与 12 | 确定性计算，无训练；默认 $\gamma=3/10$，计数窗口 6 步 | [demos/average_reward_clock.py](../demos/average_reward_clock.py) | 只在终端输出，不写文件 |

外部代码（出处）：无。转移图 law.svg 由 TikZ 绘制；Hopper 姿态图取自 Pardo 等（2018）图 5；备份图取自 Sutton 与 Barto 和 Silver 的课程讲义。

运行：
```sh
python3 demos/course15_mdp_dp.py
python3 demos/v17_classic.py
python3 demos/v18_classic.py
python3 demos/mud_prediction_lens.py
python3 demos/average_reward_clock.py
```

## 第 4 章　动态规划 {#ch-04}

本章的评价表、收缩界、策略迭代与价值迭代的各阶段，以及动作区间和更新顺序的图，都在已知的泥地模型上精确计算，不含训练。策略评价程序用有理数运算，表中的分数可以逐项核对。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| “同步迭代策略评价”（课件 `course15-dp-evaluate-code`、`course15-dp-first-sweeps`） | 第 1、2、5 轮同步评价表；旧表 $V(\mathrm{S4})=.5$ 时新 S4 为 .505、新 S7 为 .45，原地更新得 .4545 | 共用泥地任务，旧策略 $\pi_0$（S7 向上），$\gamma=.9$，从全零表开始，精确模型 | [demos/course25_dp_evaluation.py](../demos/course25_dp_evaluation.py)；[demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course25-dp-evaluation/checks.json](../assets/course25-dp-evaluation/checks.json)、[assets/course15-mdp-dp/evaluation-maps.png](../assets/course15-mdp-dp/evaluation-maps.png)、[assets/course15-mdp-dp/evaluation.csv](../assets/course15-mdp-dp/evaluation.csv) |
| 4.2 节节首与“泥地上的收缩”“停止时的误差界”（课件 `ch04-stop-problem`、`course15-dp-contraction-plot`、`course15-dp-stopping`） | 泥地标量递推与统一收缩界；第 10 轮 $\Delta_9\approx.016677$，误差上界 .15010，实际误差 .07110；第 6–16 轮误差与改变量之比恒为 4.263，两者逐轮乘 .81；按停止规则在第 67 轮返回 | 同上，有理数精确运算，并以联立方程直接求解核对 | [demos/course25_dp_evaluation.py](../demos/course25_dp_evaluation.py) | [assets/course25-dp-evaluation/contraction.png](../assets/course25-dp-evaluation/contraction.png)、[assets/course25-dp-evaluation/checks.json](../assets/course25-dp-evaluation/checks.json) |
| “策略改进定理”（课件 `course15-dp-improved-map`） | 旧策略与改进后策略的真实价值；$q_{\pi_0}(\mathrm{S7},\uparrow)=.4737$，$q_{\pi_0}(\mathrm{S7},\leftarrow)=.59049$ | 精确模型下的一步动作比较 | [demos/course25_dp_control.py](../demos/course25_dp_control.py) | [assets/course25-dp-control/improvement-values.png](../assets/course25-dp-control/improvement-values.png)、[assets/course25-dp-control/checks.json](../assets/course25-dp-control/checks.json) |
| “策略改进定理”（课件 `course15-dp-approximate-improvement`） | 旧表 S4 加 .02、S6 减 .02 时的动作区间：向上 .491684、向左 .57249，误差半径 .018 | 精确计算，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/action-intervals.png](../assets/v18-classic/action-intervals.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| 4.4 节“精确策略迭代”“全向上：五次改进的价值”；4.5 节“$V_k$ 的有限步含义”（课件 `course15-dp-policy-iteration`、`course15-dp-pi-early`、`course15-dp-vi-map`；原 `course15-dp-pi-late` 已并入 `course15-dp-pi-early`） | 策略迭代的前 3 个与后 3 个策略；价值迭代的中间表及其贪心动作 | 精确策略迭代从全部向上的策略开始；价值迭代从全零表开始，停止阈值 $10^{-6}$ | [demos/course25_dp_control.py](../demos/course25_dp_control.py) | [assets/course25-dp-control/pi-early.png](../assets/course25-dp-control/pi-early.png)、[assets/course25-dp-control/pi-late.png](../assets/course25-dp-control/pi-late.png)、[assets/course25-dp-control/vi-front.png](../assets/course25-dp-control/vi-front.png)、[assets/course25-dp-control/checks.json](../assets/course25-dp-control/checks.json) |
| 4.6 节“原地更新”（课件 `course15-dp-asynchronous`） | 改变 S7 动作时表值仍为 .474，重新评价后为 .590；同一初表的一轮同步评价与一轮原地评价 | 精确计算，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/gpi-s7.png](../assets/v18-classic/gpi-s7.png)、[assets/v18-classic/dp-order.png](../assets/v18-classic/dp-order.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| “动态规划的实现与核验” | 策略评价与价值迭代每轮七个状态的数值、有限期限首动作比较、抽样轨迹的逐步记录及汇总 | 精确模型；抽样轨迹 6 回合，随机数种子 7，仅作演示，不进入 DP 目标 | [demos/course15_mdp_dp.py](../demos/course15_mdp_dp.py) | [assets/course15-mdp-dp/evaluation.csv](../assets/course15-mdp-dp/evaluation.csv)、[assets/course15-mdp-dp/value-iteration.csv](../assets/course15-mdp-dp/value-iteration.csv)、[assets/course15-mdp-dp/finite-horizon.csv](../assets/course15-mdp-dp/finite-horizon.csv)、[assets/course15-mdp-dp/sample-trajectories.csv](../assets/course15-mdp-dp/sample-trajectories.csv)、[assets/course15-mdp-dp/results.json](../assets/course15-mdp-dp/results.json) |
| 4.7 节“采样更新的期望”（课件 `course25-method-dp-sampling`） | DP 目标 .505；TD 目标的条件期望 .505；MC 回报的条件期望 $10/19$ | 旧估计 .5；程序默认 `--old 0.5`、`--alpha 0.2` | [demos/mud_prediction_lens.py](../demos/mud_prediction_lens.py) | 只在终端输出，不写文件 |
| “三种方法的代价”“评价轮数的取舍”（课件 `ch04-method-table`、`ch04-tension`） | 截断策略迭代在 $m=1,\dots,12$ 时的改进次数与一步期望计算次数；误差要求 .01 时 $m=5$ 最省（224 次），价值迭代 532 次，策略迭代改进 4 次；误差要求 .001 时 $m=8$ 最省（308 次），价值迭代 840 次 | 从零表出发，有理数精确运算；一次贪心改进计 28 个一步期望并兼作第一轮评价，此后每轮评价计 7 个；停止规则用真值 $v_*$ 判定，只作分析用 | [demos/ch04_truncated_pi_cost.py](../demos/ch04_truncated_pi_cost.py) | 只在终端输出，不写文件 |

外部代码（出处）：无。模型图 model.svg 与单步图 step.svg 由 TikZ 绘制。

运行：
```sh
python3 demos/course25_dp_evaluation.py
python3 demos/course25_dp_control.py
python3 demos/course15_mdp_dp.py
python3 demos/v18_classic.py
python3 demos/mud_prediction_lens.py
python3 demos/ch04_truncated_pi_cost.py
```

## 第 5 章　蒙特卡洛与时序差分预测 {#ch-05}

本章的四步轨迹、学习曲线、价值表、误差曲线和批量 A/B 例来自本课的模拟。解析价值只用于核对与作图，MC 与 TD 的更新从不读取它，所以曲线反映的是两种方法从样本中学到的结果。冻结表上 TD 误差的分解是精确计算，由另一个程序作图。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 5.1 节（课件 `sample14-mctd-episode`、`sample14-mctd-mc-code`） | 固定向上策略的任务图；一回合四步轨迹及各次访问后的回报 .729、.81、.9、1；首次访问回报 S7 为 .729、S4 为 .81 | 泥地固定策略：从 S7 出发，S7 与 S4 都向上，S4 成功概率 .1，$\gamma=.9$ | [demos/sample14_mctd.py](../demos/sample14_mctd.py) | [assets/sample14-mctd/task.png](../assets/sample14-mctd/task.png)、[assets/sample14-mctd/episode.png](../assets/sample14-mctd/episode.png)、[assets/sample14-mctd/report.json](../assets/sample14-mctd/report.json) |
| 5.2 节“一步转移与后继价值”（课件 `sample14-mctd-td-write`） | 旧值 .5、步长 .2 时 TD 新估计 .49，常步长 MC 新估计 .562 | 一步算术，程序默认 `--old 0.5`、`--alpha 0.2` | [demos/mud_prediction_lens.py](../demos/mud_prediction_lens.py) | 只在终端输出，不写文件 |
| 5.2 节“TD 误差与价值更新”（课件 `sample14-mctd-td-path`、`sample14-mctd-when`） | 同一四步轨迹上的在线 TD 表：目标 .45、.45、.441、1，更新值 .41、.49、.4802、.58416；两表项的逐步更新图；TD 与 MC 可更新时刻的对照 | 固定示例轨迹 S7→S4→S4→S4→G，初值 $V(\mathrm{S7})=.4,V(\mathrm{S4})=.5$，TD 步长 .2 | [demos/sample14_mctd.py](../demos/sample14_mctd.py) | [assets/sample14-mctd/one-episode-trace.csv](../assets/sample14-mctd/one-episode-trace.csv)、[assets/sample14-mctd/online-writes.png](../assets/sample14-mctd/online-writes.png)、[assets/sample14-mctd/availability.png](../assets/sample14-mctd/availability.png) |
| 5.3 节（课件 `sample14-mctd-fixedpoint`、`sample14-mctd-noise`） | 平均 TD 误差随当前估计的变化，在真值处为零；旧表 .5 时平均 TD 误差 .005；固定尾值时的 TD 目标分布与 MC 回报分布 | 按模型对两种后果求期望的精确计算 | [demos/sample14_mctd.py](../demos/sample14_mctd.py) | [assets/sample14-mctd/mean-residual.png](../assets/sample14-mctd/mean-residual.png)、[assets/sample14-mctd/target-distributions.png](../assets/sample14-mctd/target-distributions.png)、[assets/sample14-mctd/report.json](../assets/sample14-mctd/report.json) |
| 5.4 节（课件 `sample14-mctd-values`、`sample14-mctd-learning`） | 500 回合、5473 次真实转移后，MC 为 $V(\mathrm{S7})=.47643,V(\mathrm{S4})=.52936$，TD 为 .49179、.52600；解析值 $9/19,10/19$；同一运行的逐回合估计 | 本课的模拟：首次访问 MC 用样本均值，TD(0) 步长 .05，零初值，单次运行，随机数种子 7，500 回合 | [demos/sample14_mctd.py](../demos/sample14_mctd.py) | [assets/sample14-mctd/learned-values.png](../assets/sample14-mctd/learned-values.png)、[assets/sample14-mctd/one-seed-learning.png](../assets/sample14-mctd/one-seed-learning.png)、[assets/sample14-mctd/report.json](../assets/sample14-mctd/report.json)、[assets/sample14-mctd/learning-by-seed.csv](../assets/sample14-mctd/learning-by-seed.csv) |
| 5.4 节（课件 `sample14-mctd-rmse`） | 第 500 回合的 RMSE：步长 $1/N$ 的 MC 为 .0129，固定步长 .05 的 MC 为 .0451，TD 为 .0481（各值标准误不超过 .0007）；TD 比 MC 高 .0031（标准误 .0006） | 本课的模拟：三个估计器共用同一批回合，每次运行 500 回合，零初值，独立运行 2000 次；RMSE 对 S7、S4 两个状态与全部运行取平方平均后开方，标准误对运行做自助法重抽样。同一程序还给出 5.5 节批量 MC 与批量 TD 的对照（每个 $K$ 取 200000 组） | [demos/ch05_rmse_runs.py](../demos/ch05_rmse_runs.py)（调用 ch05_matched_steps.py 的配对运行） | [assets/sample14-mctd/matched-steps-2000.pdf](../assets/sample14-mctd/matched-steps-2000.pdf)；数字由程序输出到终端 |
| 5.5 节“A–B 八回合数据”（课件 `sample14-mctd-ab-data`） | A 出现一次、B 出现八次的数据；批量 TD 给 A、B 都是 .75，批量 MC 给 A 为 0、B 为 .75 | 固定八个回合，反复做冻结旧表的批量 TD 更新直到收敛 | [demos/sample14_mctd.py](../demos/sample14_mctd.py) | [assets/sample14-mctd/ab-data.png](../assets/sample14-mctd/ab-data.png)、[assets/sample14-mctd/ab-learning.png](../assets/sample14-mctd/ab-learning.png)、[assets/sample14-mctd/report.json](../assets/sample14-mctd/report.json) |
| 5.3 节“回报误差的分解”（课件 `sample14-mctd-detail-telescope`） | 冻结 $V(\mathrm{S7})=.4,V(\mathrm{S4})=.5$ 时四项折扣 TD 误差之和 .329，等于 .729 减 .4 | 精确计算，无训练 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/frozen-td-sum.png](../assets/v18-classic/frozen-td-sum.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| “参考”后的补充计算 | 五元组映射、泥地概率树与单步控制图 | 精确模型，无训练 | [demos/v17_classic.py](../demos/v17_classic.py) | [assets/v17-classic/mdp-objects.png](../assets/v17-classic/mdp-objects.png)、[assets/v17-classic/probability-tree.png](../assets/v17-classic/probability-tree.png)、[assets/v17-classic/control-feedback.png](../assets/v17-classic/control-feedback.png)、[assets/v17-classic/checks.json](../assets/v17-classic/checks.json) |

外部代码（出处）：无。随机游走上批量 TD 与批量 MC 的比较取自 Sutton（1988）勘误版图 3；统一视角图取自 Sutton 与 Barto 第一版图 10.1；备份图取自 Silver 的课程讲义。

运行：
```sh
python3 demos/sample14_mctd.py
python3 demos/ch05_matched_steps.py --figure assets/sample14-mctd/matched-steps.pdf
python3 demos/mud_prediction_lens.py
python3 demos/v18_classic.py
python3 demos/v17_classic.py
```

## 第 6 章　动作价值控制与离策略学习 {#ch-06}

本章的模拟结果有五组：泥地上的 Q-learning 与 Double Q-learning，悬崖任务上 Sarsa 与 Q-learning 的比较，第 6 章补充阅读“有限样本下的改进保证”中有限样本下首动作的 MC 估计，6.6 节首次访问的 ε-软 MC 控制，以及 6.5 节按 Sutton 与 Barto 例 6.7 的设定重做的最大化偏差实验。软策略价值、一步目标和轨迹重要性采样的数值来自精确计算程序，不含随机性；6.5 节同一后继状态上的两表快照是手设数值的示意图。

悬崖任务与例 6.7 的设定依据 Sutton 与 Barto 例 6.6、例 6.7，结果由本课重新运行得到，原书图的数据不在表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 6.2 节“软策略的上限”（课件 `ch06-bridge-soft-cost`）；6.4 节“Q-learning 的价值估计与贪心策略” | $\varepsilon=.2$ 时最好的软策略价值 .858、.977、.754、.482、.663、.583、.514；同一组箭头保留探索时 S7 由 .590 降到 .51366 | 精确模型下的策略价值方程，每格以 .85 走箭头、其余三个方向各 .05，$\gamma=.9$ | [demos/classic_v8_foundations.py](../demos/classic_v8_foundations.py) | [assets/v8-classic/results.json](../assets/v8-classic/results.json)（`soft_policy_values`） |
| 6.3 节“Sarsa、Expected Sarsa 与 Q-learning 的目标” | 相同转移与当前 Q 下三种目标 .45、.5715、.63；练习中 $\varepsilon=.4$ 的 Expected Sarsa 目标 | 给定四个动作价值与行为概率的有限算术；目标图是课件 TikZ 页面的截图 | [demos/classic_foundations.py](../demos/classic_foundations.py) | [demos/classic-foundations-results.json](../demos/classic-foundations-results.json)、[assets/v5/classic/one-step-control-targets.png](../assets/v5/classic/one-step-control-targets.png) |
| 6.3 节“同一段经验中的一步目标与完整回报”（课件 `course25-control-no-is`）；6.1 节“行为策略的覆盖”（课件 `course26-control-exploration`） | Sarsa .45、Expected Sarsa（评价 $\pi$）.612、Q-learning .63、普通轨迹重要性采样 1.8，轨迹权重 2 | 冻结 Q 表 (.5,.1,.2,.7)，行为 $b=(.05,.05,.05,.85)$，目标 $\pi=(.1,0,0,.9)$；转移概率与奖励取自 `mud_world.outcomes`，分数精确运算 | [demos/control_record.py](../demos/control_record.py) | 只在终端输出，不写文件 |
| 6.4 节“训练与贪心回报”（课件 `course25-control-cliff-results`）；6.2 节“算法：Sarsa”（课件 `course25-sarsa-algorithm`）；6.3 节“算法：Q-learning”（课件 `learning-21`） | 最后 100 回合平均奖励 Sarsa −25.78、Q-learning −47.75；冻结 Q-learning 表纯贪心 −13.0、保留探索 −50.55；两次 Sarsa 运行纯贪心时循环；种子 0 的贪心路线经过临崖格 Q-learning 10 个、Sarsa 1 个 | 本课的模拟：4×12 悬崖，每步 −1，跌崖 −100 并回起点，$\gamma=1$，$\alpha=.5$，$\varepsilon=.1$，每次运行 500 回合，独立重复 12 次（种子 0–11）；冻结表的评价用精确有限递推计前 200 步，曲线为 20 回合滑动平均与一个标准误 | [demos/course25_sarsa_q.py](../demos/course25_sarsa_q.py) | [assets/course25-control/results.json](../assets/course25-control/results.json)、[assets/course25-control/performance.png](../assets/course25-control/performance.png)、[assets/course25-control/learned-paths.png](../assets/course25-control/learned-paths.png)、[assets/course25-control/episodes.csv](../assets/course25-control/episodes.csv)、[assets/course25-control/evaluation.csv](../assets/course25-control/evaluation.csv)、[assets/course25-control/learned-q.npz](../assets/course25-control/learned-q.npz) |
| 6.4 节“Q-learning 的价值估计与贪心策略”（课件 `v17-classic-control-feedback`） | 给定 Q 快照的一次可能更新及下回合的动作变化 | 单步教学算例，精确模型，无训练 | [demos/v17_classic.py](../demos/v17_classic.py) | [assets/v17-classic/control-feedback.png](../assets/v17-classic/control-feedback.png)、[assets/v17-classic/checks.json](../assets/v17-classic/checks.json) |
| 6.4 节“泥地 Q-learning”（课件 `classic-v6-q-policies`，现用图） | 100 次独立运行在 100、1000、20000 个真实步后的 $\max_aQ$ 均值与多数贪心箭头；两万步时 S4 为 .539±.007（标准误，标准差 .067），真值 .526；S7 在 100 次中都向左、取 .590；种子 7 复现下一行的单次运行（S4 .549） | 本课的模拟：沿用 demos/classic_v6_lab.py 的控制循环（初值 1，$\alpha=.05$，$\varepsilon=.2$，从 S7 重置，20000 个真实转移），种子 0–99 | [demos/ch06_control_figs.py](../demos/ch06_control_figs.py) | [assets/ch06-control/mud-q-runs.pdf](../assets/ch06-control/mud-q-runs.pdf)、[assets/ch06-control/results.json](../assets/ch06-control/results.json) |
| 6.4 节（课件 `classic-v13-cliff` 之后的 `course25-control-cliff-paths`、`course25-control-cliff-results`、`v17-classic-control-feedback`，现用图） | 悬崖贪心路线、训练曲线与冻结回报、单步反馈算例按本课字体重画 | 悬崖两图读自 demos/course25_sarsa_q.py 的输出（assets/course25-control/），不重训；单步反馈算例在程序内重算（目标 .36，更新后 .43） | [demos/ch06_control_figs.py](../demos/ch06_control_figs.py) | [assets/ch06-control/](../assets/ch06-control/) 下的 cliff-paths.pdf、cliff-results.pdf、control-feedback.pdf |
| 6.4 节“Q-learning 的价值估计与贪心策略”（课件 `classic-v6-q-policies` 的旧图，单次运行） | 100、1000、20000 个真实步后的最大 Q 与贪心箭头，最后 S7 向左绕行；冻结贪心策略的精确评价 .59049；零初值、步长 .1 时两万步后仍经泥地 | 本课的模拟：从 S7 重置，Q-learning，初值 1，$\alpha=.05$，$\varepsilon=.2$，20000 个真实转移，单次运行，随机数种子 7；另一组初值 0、$\alpha=.1$ | [demos/classic_v6_lab.py](../demos/classic_v6_lab.py) | [assets/v6-classic/control-policies.png](../assets/v6-classic/control-policies.png)、[assets/v6-classic/results.json](../assets/v6-classic/results.json)、[assets/v6-classic/zero-init-results.json](../assets/v6-classic/zero-init-results.json)、[assets/v6-classic/control-policies-zero.png](../assets/v6-classic/control-policies-zero.png) |
| 第 6 章补充阅读“有限样本下的改进保证”之“有限样本的动作价值与改进保证”（课件 `classic-v10-control-margin`） | 每个首动作 20、200、2000 回合后的估计，2000 回合时向上 .471000、向左 .590490；观察差距 .157677、.135820、.119490；两个误差半径之和 .740313、.234108、.074031 | 本课的模拟：可重置到 S7，分别指定首动作向上、向左，之后固定旧策略，各收集独立完整回合，随机数种子 7；Hoeffding 界的同时失败概率 .05 | [demos/classic_v10_derivations.py](../demos/classic_v10_derivations.py) | [assets/classic-v10/mc-action-estimates.dat](../assets/classic-v10/mc-action-estimates.dat)、[assets/classic-v10/derivations.json](../assets/classic-v10/derivations.json) |
| 6.7 节“轨迹重要性采样：泥地算例” | 按比率加权后期望由 .532087 变为 .497045；目标策略的线性方程解得同一数值 | 行为在 S7 上、左各 .5，目标 .8、.2，之后旧策略；轨迹枚举与线性方程两种精确计算 | [demos/classic_v10_derivations.py](../demos/classic_v10_derivations.py) | [assets/classic-v10/derivations.json](../assets/classic-v10/derivations.json)（`mud_IS`） |
| 6.5 节 | 同一后继状态上的两表快照：A 选上，B 评价上的 .3 | 手设数值的示意图 | [demos/v18_classic.py](../demos/v18_classic.py) | [assets/v18-classic/double-tables.png](../assets/v18-classic/double-tables.png)、[assets/v18-classic/checks.json](../assets/v18-classic/checks.json) |
| 6.6 节（课件 `classic-v10-control-estimates`） | S7 的贪心动作在第 10 回合由上改为左，之后不再改回；2000 回合中选上 133 次；ε-软策略下的精确动作价值：上 .434、左 .524；100 个种子中 S7 选左的比例，第 20 回合 79%、第 200 回合 94%、第 2000 回合 100% | 本课的模拟：泥地上首次访问的 ε-软 MC 控制（算法 6.4），$\varepsilon=.2$，$m=4$，每回合从 S7 出发，$Q_0=0$，并列时取 $\pi_0$ 的动作，样本均值更新，单次运行种子 7 | [demos/ch06_soft_mc_control.py](../demos/ch06_soft_mc_control.py) | [assets/classic-v10/mc-soft-control-estimates.dat](../assets/classic-v10/mc-soft-control-estimates.dat)（列 n up left nup nleft） |
| 6.5 节（课件 `classic-v8-double-policy`） | 例 6.7：第 1–10 回合选左的比例 Q-learning .70、Double Q-learning .49；峰值 Q-learning .95（第 21 回合）、Double Q-learning .52（第 5 回合）；最后 50 回合 .117 与 .064（最优 .05）。泥地：Q-learning 的 S4 均值 .528（真值 .526），标准误约 .006；Double Q-learning 的 S4 均值 .521；两者在 100 次运行中 S7 都选左 | 本课的模拟。例 6.7：B 处 10 个动作，奖励 $N(-.1,1)$，$\varepsilon=.1$，$\alpha=.1$，$\gamma=1$，$Q_0=0$，每次运行 300 回合，独立重复 2000 次，种子 61、62。泥地：独立重复 100 次（种子 1000–1099），每次 20000 步，$\alpha=.05$，$\varepsilon=.2$，$\gamma=.9$，$Q_0=1$ | [demos/ch06_double_q_runs.py](../demos/ch06_double_q_runs.py) | [assets/ch06-double/example67.pdf](../assets/ch06-double/example67.pdf)、[assets/ch06-double/results.json](../assets/ch06-double/results.json) |

外部代码（出处）：无。悬崖任务图按 Sutton 与 Barto 例 6.6 用 TikZ 重画，路线为示意；Sarsa 回溯图仿 Silver 第 5 讲重画；Expected Sarsa 的算法框参照 Sutton 与 Barto §6.6。

运行：
```sh
python3 demos/course25_sarsa_q.py
python3 demos/classic_v6_lab.py
python3 demos/classic_v6_lab.py --initial-q 0 --control-alpha .1 --output /tmp/v6-classic-zero
python3 demos/classic_v8_foundations.py
python3 demos/classic_v10_derivations.py
python3 demos/ch06_soft_mc_control.py
python3 demos/ch06_double_q_runs.py   # 写 assets/ch06-double
python3 demos/control_record.py
python3 demos/classic_foundations.py
python3 demos/v17_classic.py
python3 demos/v18_classic.py
python3 demos/ch06_control_figs.py
```

## 第 7 章　多步学习与资格迹 {#ch-07}

本章的多步目标、$\lambda$ 权重、资格迹账本、真在线 TD 的逐前缀对照和离策略两步枚举，都在同一条四步泥地轨迹 S7→S4→S4→S4→G 或已知模型上精确计算，多数用有理数运算。各种方法用同一条轨迹，它们的数可以逐项对照。7.5 节例 12.1 路线上的三种 Sarsa 与 9.6 节三页研究算例也是精确计算，各取自己的小例子。学习曲线、价值图和三种迹的扫描表来自模拟，学习曲线独立重复 64 次。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 7.1 节（课件 `course15-trace-targets`） | 一、二、三步目标与完整回报 .45、.405、.3645、.729；目标树图 | 冻结表 $V(\mathrm{S7})=.4,V(\mathrm{S4})=.5$，$\gamma=.9$，固定四步轨迹；有限算术，无训练 | [demos/course21_trace_visuals.py](../demos/course21_trace_visuals.py) | [assets/course21-traces/nstep-trees.png](../assets/course21-traces/nstep-trees.png)、[assets/course21-traces/calculations.json](../assets/course21-traces/calculations.json)（`nstep_returns`） |
| 7.1 节“等待时间与尾值误差”（课件 `course15-trace-distribution`） | S4 一步目标均值 .505、方差约 .0272；两步目标均值 .50905、方差约 .0466；目标分布图 | 尾值 $V(\mathrm{S4})=.5$，按模型对全部后果求期望的精确计算 | [demos/course15_traces.py](../demos/course15_traces.py) | [assets/course15-traces/target-distribution.png](../assets/course15-traces/target-distribution.png)、[assets/course15-traces/report.json](../assets/course15-traces/report.json)（`target_distributions`） |
| 7.1 节“实验：$n$ 的选择”（课件 `course15-trace-nstep-learning`，现用两图） | 左：泥地 $\alpha=.05$ 下 $n=1,4,16$ 的误差曲线，第 10 回合 .316、.225、.220，第 200 回合 .042、.065、.085；右：19 状态随机游走前 10 回合平均误差对 $\alpha$ | 左图读下一行 course15_traces.py 写出的 training-values.csv（64 次独立运行），不重训；右图按 Sutton 与 Barto 图 7.2 的设定重算，每组 $(n,\alpha)$ 100 次独立运行 | [demos/ch07_nstep_learning_cn.py](../demos/ch07_nstep_learning_cn.py) | [assets/course15-traces/learning-n-cn.pdf](../assets/course15-traces/learning-n-cn.pdf)、[assets/course15-traces/random-walk-nstep-cn.pdf](../assets/course15-traces/random-walk-nstep-cn.pdf) |
| 7.1 节“多步更新的执行时刻”（课件 `course15-trace-nstep-learning` 的旧图） | $n=1,4,16$ 的预测误差曲线 | 本课的模拟：固定向上策略，零初值，步长 .05 与 .2，各方法在同一次重复中读相同回合，每次 200 回合，独立重复 64 次（种子偏移 150700）；阴影为一个标准误 | [demos/course15_traces.py](../demos/course15_traces.py) | [assets/course15-traces/learning-n.png](../assets/course15-traces/learning-n.png)、[assets/course15-traces/training-values.csv](../assets/course15-traces/training-values.csv)、[assets/course15-traces/report.json](../assets/course15-traces/report.json)（`experiment`、`learning_summary`） |
| 7.2 节“$\lambda$-回报的水桶”（课件 `course15-trace-lambda`） | $\lambda=.8$ 的四个权重 .2、.16、.128、.512，$G_0^\lambda=.574704$；权重区间图 | 同一冻结表与轨迹，有理数精确运算 | [demos/trace_credit_lens.py](../demos/trace_credit_lens.py)；[demos/course21_trace_visuals.py](../demos/course21_trace_visuals.py) | [assets/trace-credit-lens/horizon-mixture.png](../assets/trace-credit-lens/horizon-mixture.png)、[assets/course21-traces/calculations.json](../assets/course21-traces/calculations.json)（`lambda_weights`、`lambda_return`）；程序写 PDF，讲义用同名 PNG |
| 7.3 节“一个新误差分给哪些状态”（课件 `course15-trace-fading`）；“迹的胶片：一回合的账本” | 末步 S7 的迹 .373248、S4 的迹 2.2384；S7 随末步误差提高 .0373；账本中逐步的 $\delta_t$、$e_t$ 与 $\alpha\delta_te_t$，两格总增量 .0349408 与 .19664 | 冻结表 (.4,.5)，$\alpha=.2$，$\gamma\lambda=.72$；有理数精确运算，并核对前向 $\lambda$-回报误差等于后向迹的累计 | [demos/trace_credit_lens.py](../demos/trace_credit_lens.py) | [assets/trace-credit-lens/visit-strips.png](../assets/trace-credit-lens/visit-strips.png)、[assets/trace-credit-lens/signed-writes.png](../assets/trace-credit-lens/signed-writes.png)；逐步数值只在终端输出 |
| 7.3 节“同一张表，两种加法”（课件 `ch07-two-sums`）；第 7 章补充阅读“权重矩阵的行与列”（课件 `course15-trace-matrix`） | TD 误差 .05、−.05、−.05、.5；行和 .174704、.1732、.31、.5；S4 末列 1.1192 | 同一冻结表，$\gamma=.9,\lambda=.8$；有理数逐项计算，无训练 | [demos/course21_trace_matrix.py](../demos/course21_trace_matrix.py) | [assets/course21-traces/credit-matrix.png](../assets/course21-traces/credit-matrix.png)、[assets/course21-traces/credit-matrix.json](../assets/course21-traces/credit-matrix.json) |
| 7.3 节“一个新误差分给哪些状态”末段（课件 `course15-trace-lambda-learning`、`course15-trace-value-maps`） | 不同步长与 $\lambda=0,.8,1$ 下的预测误差曲线；价值图 | 与 7.1 节的学习曲线同一批运行：每次 200 回合，独立重复 64 次 | [demos/course15_traces.py](../demos/course15_traces.py) | [assets/course15-traces/learning-lambda.png](../assets/course15-traces/learning-lambda.png)、[assets/course15-traces/value-maps.png](../assets/course15-traces/value-maps.png)、[assets/course15-traces/training-values.csv](../assets/course15-traces/training-values.csv) |
| 7.4 节（课件 `ch07-online-three`、`course15-trace-true-online-code`） | 冻结表整回合更新后 $V(\mathrm{S4})=.6966$；普通累积迹第三步 .473144、终止后 .7090；在线前向参照与真在线 TD 均为 .6713；四个前缀的对照图 | 初值 (.4,.5)，$\alpha=.2,\lambda=.8$，同一四步轨迹；程序另以随机线性特征逐前缀核对真在线递推 | [demos/course15_traces.py](../demos/course15_traces.py) | [assets/course15-traces/online-equivalence.png](../assets/course15-traces/online-equivalence.png)、[assets/course15-traces/prefixes.json](../assets/course15-traces/prefixes.json)、[assets/course15-traces/four-step-trace.csv](../assets/course15-traces/four-step-trace.csv)、[assets/course15-traces/report.json](../assets/course15-traces/report.json)（`frozen_final`、`ordinary_final`、`true_online_final`） |
| 7.4 节“在线前向目标与 Dutch 迹” | Dutch 迹在第三步 S4 为 1.576，终点前为 1.907776 | 同一轨迹与初值，$\alpha=.2,\lambda=.8$；另做 120 组随机线性特征的独立核对 | [demos/classic_v13_mechanisms.py](../demos/classic_v13_mechanisms.py) | [assets/classic-v13/results.json](../assets/classic-v13/results.json)（`traces.true_online_diagnostics`） |
| 7.4 节“三种迹的 $\lambda$ 扫描”（课件 `ch07-trace-sweep`） | 两格均方根误差在全部回合上的平均：$\alpha=.2,\lambda=.8$ 时累积 .2658、Dutch .1484、替换 .1035；$\lambda=1$ 时 .5349、.2027、.1038；$\alpha=.05,\lambda=1$ 时 .1530、.1070、.0692 | 本课的模拟：固定向上策略，零初值，表格在线 TD($\lambda$)，三种迹与 $\lambda\in\{0,.2,.4,.6,.8,.9,.95,1\}$ 在同一次重复中共用回合，步长 .05 与 .2，每次 200 回合，独立重复 100 次（种子 0–99） | [demos/ch07_trace_sweep.py](../demos/ch07_trace_sweep.py) | [demos/ch07-trace-sweep-results/summary.json](../demos/ch07-trace-sweep-results/summary.json) |
| 7.5 节（课件 `course15-trace-sarsa-traces`） | Sutton 与 Barto 例 12.1 路线上一步 Sarsa、十步 Sarsa 与 Sarsa(.9) 对各状态动作对的增量 | 固定 17 步路线，$\gamma=1$，$\alpha=1$，零初值，累积迹；有限算术，无训练；图为原书插图 | [demos/ch07_sarsa_lambda.py](../demos/ch07_sarsa_lambda.py) | 只在终端输出，不写文件 |
| 7.5 节“后续动作由谁产生”（课件 `course15-trace-offpolicy`、`course15-trace-tree`） | 两步 Sarsa 的比率 $2\times2=4$，Expected Sarsa 的比率 2；所有两步记录上直接平均、比率校正与树回退的目标均值 | 冻结 Q 表 (.5,.1,.2,.7)，行为 $b=(.05,.05,.05,.85)$，目标 $\pi=(.1,0,0,.9)$；转移概率与奖励取自 `mud_world.outcomes`，分数精确运算 | [demos/control_record.py](../demos/control_record.py) | 只在终端输出，不写文件 |
| 9.6 节“梯度校正 QRC($\lambda$)”（课件 `ch07-td-research-gradient`） | 普通半梯度方向使样本 TD 误差增加 $.8\alpha$；QRC 校正方向使残差减少 $1.45\alpha$ | $\hat q=w_1$，$\hat q'=2w_1+w_2$，$\mathbf w=(0,0)$，$R=1$，$\gamma=.9$，$H_t=1$；单条转移的精确计算 | [demos/ch07_td_research.py](../demos/ch07_td_research.py) | [assets/ch07-research/qrc-directions.svg](../assets/ch07-research/qrc-directions.svg)、[assets/ch07-research/qrc-directions.pdf](../assets/ch07-research/qrc-directions.pdf) |
| 9.6 节“意图步长 TD”（课件 `ch07-intentional-td`） | 固定参数步长下特征 1 与 2 的预测增加量 .4 与 1.6；按预测变化规定步长时均为 .4 | 单条终止转移，初始参数 0，目标 1，$\nu=.4$；有理数运算，无训练 | [demos/intentional_td_scale.py](../demos/intentional_td_scale.py) | [assets/ch07-research/intentional-scale.svg](../assets/ch07-research/intentional-scale.svg)、[assets/ch07-research/intentional-scale.pdf](../assets/ch07-research/intentional-scale.pdf) |
| 9.6 节“级联资格迹”（课件 `ch07-td-research-delay`） | 平均时间 5 的单指数迹与五级串联迹：距今 1 时 .164 与 .015，距今 4 时 .090 与 .195，串联峰值在 4 | 面积为 1 的连续时间脉冲响应，数值积分核对面积与平均时间 | [demos/ch07_td_research.py](../demos/ch07_td_research.py) | [assets/ch07-research/delay-kernels.svg](../assets/ch07-research/delay-kernels.svg)、[assets/ch07-research/delay-kernels.pdf](../assets/ch07-research/delay-kernels.pdf) |

外部代码（出处）：QRC($\lambda$) 的作者实现，Elelimy 等的 [gtd_algos 仓库中的 qrc.py](https://github.com/esraaelelimy/gtd_algos/blob/76293dea9b2129d55e08bfb4178618a0a26c2dd8/gtd_algos/src/algorithms/qrc.py)；Intentional TD 的作者实现 [Intentional_RL](https://github.com/sharifnassab/Intentional_RL)；连续时间资格迹的作者实验 [CET](https://github.com/avecplezir/CET/tree/f2a624b422ebf0cc01904d6b3cf73a2582d1fcfa/RL)。MinAtar 上的回报曲线取自 Elelimy 等的论文，本课没有重跑。例 12.1 的网格图、前向与后向视角图、$n$ 步与 $\lambda$ 谱图取自 Sutton 与 Barto 第 2 版。

运行：
```sh
python3 demos/course15_traces.py
python3 demos/ch07_nstep_learning_cn.py
python3 demos/course21_trace_visuals.py
python3 demos/course21_trace_matrix.py
python3 demos/trace_credit_lens.py --figures
python3 demos/classic_v13_mechanisms.py
python3 demos/ch07_trace_sweep.py --out demos/ch07-trace-sweep-results
python3 demos/ch07_sarsa_lambda.py
python3 demos/control_record.py
python3 demos/ch07_td_research.py
python3 demos/intentional_td_scale.py --plot
```

## 第 8 章　模型学习与规划 {#ch-08}

本章的模拟结果包括泥地上的真实尝试记录、Dyna 运行、规划预算比较、轨迹采样、捷径迷宫，以及同一预算下的预测误差。规划路径、前瞻搜索、跨训练集的选路概率和模型误差分解则在给定的计数上精确计算。

表末两行的递归与直接多步预测比较原在 8B 节，现属第 22 章 22.1 节，程序同时为第 12 章所用。捷径迷宫的超参数取自外部代码，见表后。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 8.1 节“计数模型”（课件 `learning-35`）；8.2 节“真实更新与规划更新”（课件 `dyna-original`） | S4 向上的逐次真实尝试记录，前十次中两次到达 G，计数模型 $\hat p=2/10$ | 本课的模拟：从 S4 重复尝试向上，真实成功概率 .1，共 80 次尝试，随机数种子 2 | [demos/mud_planning.py](../demos/mud_planning.py) | [assets/mud-planning/real-trials.csv](../assets/mud-planning/real-trials.csv)、[assets/mud-planning/reader.json](../assets/mud-planning/reader.json)（`trials`） |
| 8.1 节（计数模型的独立诊断） | $N=10,100,1000$ 时 S4 成功率 0、.06、.097，经验模型中的旧策略价值 0、.38961、.51789，真实价值 .52632 | 本课的模拟：每个状态动作各做 $N$ 次独立转移试验，随机数种子 7；再在经验模型上精确评价旧策略 | [demos/classic_v8_foundations.py](../demos/classic_v8_foundations.py) | [assets/v8-classic/results.json](../assets/v8-classic/results.json)（`learned_model_rows`） |
| 8.1 节“模型的期望更新与样本更新”“模型误差与模型内部的抽样误差” | 冻结 $V_Q(\mathrm{S4})=.5$ 时真实目标均值 .505、模型目标均值 .560，偏差 .055；模型抽样方差 .0484 按 $1/K$ 下降，偏差平方不变 | 真实成功概率 .1，模型 $\hat p=.2$；精确计算，无训练 | [demos/classic_v13_mechanisms.py](../demos/classic_v13_mechanisms.py) | [assets/classic-v13/model-error-budget.png](../assets/classic-v13/model-error-budget.png)、[assets/classic-v13/results.json](../assets/classic-v13/results.json)（`model_budget`） |
| 8.1 节“同一批真实转移能学到多准”（课件 `vision-model-planning`） | 四种方法的 RMSE 随真实行动数的变化；8 步时一步 TD .408、MC .436，128 步时 .249、.083 | 本课的模拟：固定策略在 S4 向上，$p=.1$，$\gamma=.9$；真实行动预算 8 至 2048；一步 TD（步长 $1/t$）、四步 TD、每次访问 MC 与拟合模型共用同一条轨迹；独立重复 256 次（种子 0–255） | [demos/prediction_information_budget.py](../demos/prediction_information_budget.py) | [assets/prediction-information/learning.svg](../assets/prediction-information/learning.svg)、[assets/prediction-information/runs.json](../assets/prediction-information/runs.json)、[assets/prediction-information/predictions.csv](../assets/prediction-information/predictions.csv) |
| 8.2 节“Dyna-Q 与模拟经验” | 第十一次真实尝试留在 S4：$Q(\mathrm{S4},\uparrow)$ 由 .400 到 .410，$\hat p$ 由 2/10 到 2/11；随后一次模型查询得 .418 或 .528，条件均值 .438 | 前十次的计数与 $Q(\mathrm{S4},\uparrow)=.4$，步长 .2；第十一次尝试取自随机数种子 2 的同一试验序列 | [demos/mud_planning.py](../demos/mud_planning.py)（`--dyna-step`） | 只在终端输出，不写文件 |
| 8.2 节“规划更新是学到模型上的 DP 回溯” | $\hat p=.2$ 时期望更新 $W_4=.470097$、$W_8=.596430$、$W_{16}=.639504$，$W_8$ 首次越过干路 .59049 | 在计数模型上从 $W_0=0$ 反复做期望更新；精确计算，无训练 | [demos/mud_planning.py](../demos/mud_planning.py) | [assets/mud-planning/path.csv](../assets/mud-planning/path.csv) |
| 8.2 节“规划计算与真实策略价值”（课件 `ch08-planning-budget-mud`） | 每个真实步规划 0、5、20 次时，冻结贪心策略的平均 $v(\mathrm{S7})$ 为 $.333$、$.395$、$.420$（样本标准差 .217、.231、.210）；走干路、泥路、到不了 G 的运行分别占 0.6%、69.6%、29.8%，32.3%、43.2%、24.5%，30.8%、50.2%、19.0% | 本课的模拟：泥地 Dyna-Q，计数模型，从 S7 出发，1500 个真实步，$\alpha=.2$，$\epsilon=.2$，$\gamma=.9$；行动用种子 0–999，规划抽样用种子加 100000，每组独立重复 1000 次；冻结贪心策略（平局按上、右、下、左取）用真实转移核精确评价。旧页的 10 次运行（$.379$、$.355$、$.308$，[demos/td_control.py](../demos/td_control.py)）仍可复现，课件已不用 | [demos/ch08_planning_budget_mud.py](../demos/ch08_planning_budget_mud.py)（参数 1000，约 70 秒） | 只在终端输出；第二个参数可选，写出每次运行的 JSON |
| 8.3 节“优先扫描与搜索控制”（课件 `classic-v10-dyna-computation`） | 三次模型查询的目标与更新：.18 后写入 .036，.0324 后写入 .00648 | 给定 Q 表与步长 .2 的有限算术 | [demos/classic_v10_derivations.py](../demos/classic_v10_derivations.py) | [assets/classic-v10/derivations.json](../assets/classic-v10/derivations.json)（`dyna_schedule`） |
| 8.3 节“轨迹采样”（课件 `ch08-trajectory-sampling`） | $b=3$ 时均匀扫描 .938、1.643、2.001、2.369、3.314，轨迹采样 1.451、1.868、2.004、2.115、2.907；领先到约 1250 次；$b=1$ 时 20000 次为 7.820 比 7.029；更新最多的 1% 与 10% 状态动作对占 28.5% 与 57.8% 的计算 | 本课的模拟：按 Sutton 与 Barto §8.6 的随机任务，1000 个状态、每状态 2 个动作，分支 $b=1$ 与 $b=3$，每次转移以 .1 终止，期望更新预算 20000，每 250 次精确评价一次起点价值，独立重复 200 次（每次一个新任务，NumPy 随机数种子 20261118） | [demos/ch08_trajectory_sampling.py](../demos/ch08_trajectory_sampling.py) | [demos/ch08-trajectory-sampling-results/results.json](../demos/ch08-trajectory-sampling-results/results.json)（百分比由 `sorted_counts_mean` 算出） |
| 8.4 节“后台规划与决策时搜索”（课件 `planning-two-uses`） | $\hat p=2/10$ 时前瞻五步泥路 .47010；六步干路 .59049 胜过泥路 .51847；九步泥路 .59643 胜出；真实回报干路 .59049、泥路 .47368 | 只拟合 S4 成功率，取前十次真实尝试；分数精确运算的深度受限前瞻，选定路线另用环境模型评价 | [demos/route_search.py](../demos/route_search.py) | [assets/mud-planning/search.json](../assets/mud-planning/search.json) |
| 8.4 节“想得多不一定走得好”（课件 `v17-methods-model-decision`） | $k=7$ 泥路估值 .57837，$k=8$ 为 .59643 改选泥路；再读六次失败后 .45111，改回干路；$p=.1$、$N=10$ 时约 26.4% 的训练集选泥路 | 前 10 次与前 16 次真实尝试（随机数种子 2）的计数模型上做 $k$ 次期望更新；跨训练集的选路概率按二项分布精确加权 | [demos/mud_planning.py](../demos/mud_planning.py) | [assets/mud-planning/planning.svg](../assets/mud-planning/planning.svg)、[assets/mud-planning/path.csv](../assets/mud-planning/path.csv)、[assets/mud-planning/population.csv](../assets/mud-planning/population.csv)、[assets/mud-planning/reader.json](../assets/mud-planning/reader.json)（`table`） |
| 8.6 节“模型过时与探索奖励” | 两万步后的最大动作价值与贪心箭头；$Q(\mathrm{S4},\uparrow)=.53445$；真实记录 165 次成功、1416 次停留，经验模型给出 .53816，环境给出 .52632 | 本课的模拟：Dyna-Q，从 S7 重置，初值 1，$\alpha=.05$，$\epsilon=.2$，每个真实步 5 次规划更新，20000 个真实转移，单次运行，随机数种子 7；冻结策略用精确模型评价 | [demos/classic_v6_lab.py](../demos/classic_v6_lab.py) | [assets/v6-classic/dyna-policy.png](../assets/v6-classic/dyna-policy.png)、[assets/v6-classic/results.json](../assets/v6-classic/results.json)（`dyna`，计数在 `mud_up_counts`） |
| 8.6 节“Dyna-Q+与捷径探索”（课件 `ch08-dyna-plus-algorithm`、`classic-v13-dyna-plus`） | 开墙前到达终点 Dyna-Q 113.90、Dyna-Q+ 135.35 次，开墙后 164.55、228.85 次；Dyna-Q 3 次运行进入新格、0 次穿过；Dyna-Q+ 20 次全部穿过，首次穿过延迟中位数 375 步 | 本课的模拟：6×9 捷径迷宫，第 3000 步后打开缺口，共 6000 个真实步，每个真实步 50 次规划，$\alpha=1$，$\gamma=.95$，$\epsilon=.1$，$\kappa=.001$，独立重复 20 次（种子 0–19） | [demos/shortcut_exploration.py](../demos/shortcut_exploration.py) | [assets/shortcut-exploration/shortcut.png](../assets/shortcut-exploration/shortcut.png)、[assets/shortcut-exploration/results.json](../assets/shortcut-exploration/results.json)、[assets/shortcut-exploration/curves.csv](../assets/shortcut-exploration/curves.csv)、[assets/shortcut-exploration/runs.csv](../assets/shortcut-exploration/runs.csv)、[assets/shortcut-exploration/events.csv](../assets/shortcut-exploration/events.csv) |
| 第 22 章 22.1 节“模型误差的传播上界”，图 22.1a（原 8B.2 节） | 收缩系统 $f(x)=.5x$、$\widehat f(x)=.4x$ 的实际误差 0、.1、.09、.061、.0369，Lipschitz 上界向 .2 增长 | 从起点 1 逐步递推，精确计算，无训练 | [demos/multiscale_models.py](../demos/multiscale_models.py)；[demos/continual_figures.py](../demos/continual_figures.py)（作图） | [demos/multiscale-results/counterexample.csv](../demos/multiscale-results/counterexample.csv)、[assets/continual/contractive-counterexample.png](../assets/continual/contractive-counterexample.png) |
| 第 22 章 22.1 节“递归与直接预测的同数据比较”，两张误差表与图 22.1b（原 8B.5 节） | 正确模型类、$N=32$ 时 $k=1,8,16$ 的均值 MSE：递归 .000114、.001577、.001182，直接 .001298、.005882、.006612；$N=256$、16 步 .000137 与 .000774。遗漏截距时为 .05549、1.00266、1.47058 与 .04145、.71348、.97269；$N=256$、16 步 1.46094 与 .94841 | 本课的模拟：两种线性过程（$a=.9,c_0=0,\sigma=.2$；$a=.8,c_0=.2,\sigma=.1$），每个训练集 $N=32$ 或 256 条轨迹、每条 16 个转移，起点取自 Uniform$[-1,1]$；递归一步与直接 $k$ 步均为无截距最小二乘，误差按起点分布精确积分；独立重复 300 次（基准种子 602810） | [demos/multiscale_models.py](../demos/multiscale_models.py)；[demos/continual_figures.py](../demos/continual_figures.py)（作图） | [demos/multiscale-results/linear-32.csv](../demos/multiscale-results/linear-32.csv)、[demos/multiscale-results/linear-256.csv](../demos/multiscale-results/linear-256.csv)、[demos/multiscale-results/omitted_intercept-32.csv](../demos/multiscale-results/omitted_intercept-32.csv)、[demos/multiscale-results/omitted_intercept-256.csv](../demos/multiscale-results/omitted_intercept-256.csv)、[demos/multiscale-results/summary.json](../demos/multiscale-results/summary.json)、[demos/multiscale-results/raw.csv](../demos/multiscale-results/raw.csv)、[demos/multiscale-results/manifest.json](../demos/multiscale-results/manifest.json)、[assets/continual/multiscale-results.png](../assets/continual/multiscale-results.png) |

外部代码（出处）：捷径迷宫的超参数取自 Shangtong Zhang 与 Kenta Shimada 的 `chapter08/maze.py`（figure_8_5），https://github.com/ShangtongZhang/reinforcement-learning-an-introduction/blob/master/chapter08/maze.py ；本课的程序为独立实现，随机数流、开墙时刻与统计量另行规定。Dyna 架构图、Dyna 迷宫图（图 8.2）、图 8.7 与捷径迷宫图取自 Sutton 与 Barto；统一视角图取自 Sutton 与 Barto 第一版图 10.1。

运行：
```sh
python3 demos/mud_planning.py --output assets/mud-planning
python3 demos/mud_planning.py --dyna-step
python3 demos/route_search.py --output assets/mud-planning/search.json
python3 demos/classic_v8_foundations.py
python3 demos/classic_v13_mechanisms.py
python3 demos/prediction_information_budget.py --plot
python3 demos/td_control.py
python3 demos/v18_methods.py
python3 demos/classic_v10_derivations.py
python3 demos/ch08_trajectory_sampling.py --out demos/ch08-trajectory-sampling-results
python3 demos/classic_v6_lab.py
python3 demos/shortcut_exploration.py
python3 demos/multiscale_models.py
python3 demos/continual_figures.py
```

## 第 9 章　价值函数逼近 {#ch-09}

本章的随机游走学习曲线、一次更新的波及与步长表、两状态离策略任务的平均倍数与 GTD 实验，以及学右忘左的遗忘曲线，都来自本课的程序。Mountain Car 的价值曲面、Baird 反例与投影几何图取自原书和 RLSS 课件，没有对应程序。阅读稿 9.1 节的访问权重柱图（`assets/ch09-revision/fa-walk.pdf`）与 9.4 节的平均更新系数图（`assets/ch09-revision/off-gain.pdf`）用 Matplotlib 画成，项目中没有画这两张图的程序，未列入表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 章首；9.1 节；9.2 节；9.3 节 | 19 状态随机游走与三组参数图；状态 4 一次更新在 one-hot 与聚合表示中的传播；真值、最佳三个常数与访问频率；两种投影；沿对称方向的价值误差与 TD 平均方向；只改状态权重的两组解析解（右组 MC 解 $17/30\to.65$，TD 平衡值 $1/7\to1/2$） | 本课的计算：19 个非终止状态，起点 10，退出奖励 $\mp1$，$\gamma=1$，状态分 1–6、7–13、14–19 三组；$\mu(s)=\min(s,20-s)/100$；解析参照只用于评价 | [demos/course15_approximation.py](../demos/course15_approximation.py) | [assets/course15-fa/results.json](../assets/course15-fa/results.json)；图见 [assets/course15-fa/README.md](../assets/course15-fa/README.md)（task、sharing、values-visits、projection、objective-fixedpoint、weighting） |
| 9.1 节“瓦片编码与局部泛化” | 输入 $s=.53$ 激活四个格子，$\delta=2,\alpha=.05$ 后每个权重 $+.1$，起点价值 $+.4$，共享两格的状态 $+.2$ | 本课的计算：四层错位的瓦片网格，各自独立权重，一次线性更新（函数 `tile_features`） | [demos/deep_v13_connections.py](../demos/deep_v13_connections.py) | [assets/deep-v13/checks.json](../assets/deep-v13/checks.json)（`tile_update`）；[assets/deep-v13/tile-generalization.png](../assets/deep-v13/tile-generalization.png) |
| 9.1 节“傅里叶基”“一次更新波及哪里”“步长怎样定”“目标跟着预测移动”；课件 ch09-fourier、ch09-spread、ch09-step-size、ch09-target-moves | 傅里叶 1、3、5 阶加权 RMSE：$\gamma=.9$ 时 $.092,.045,.023$，$\gamma=1$ 时 $.040,.013,.006$；五种特征在状态 16 的波及柱图（傅里叶 5 阶在 1、2 处约 $.24,.12$）；步长表（粗编码 $\mathbb E[\mathbf x^\top\mathbf x]=3.44,\alpha=.029$；傅里叶 $3.26,.031$）；两状态例 $.8\to.864$ | 本课的计算：主算例的精确加权最小二乘与单次更新，$\tau=10$；无采样 | [demos/ch09_mechanisms.py](../demos/ch09_mechanisms.py) | [demos/ch09-mechanisms-results/results.json](../demos/ch09-mechanisms-results/results.json)（`fourier`、`spread`、`step_rule`、`chase`） |
| 9.1 节“半梯度的求导路径” | 同一转移后聚合价值函数的变化：两种更新都把第一组从 $-.4$ 提到 $-.34$，完整残差梯度还把第二组从 $.2$ 降到 $.14$ | 本课的计算：$\delta=.6,\alpha=.1$ 的一次更新，有限差分核对梯度 | [demos/v18_methods.py](../demos/v18_methods.py) | [assets/v18-methods/report.json](../assets/v18-methods/report.json)（`semigradient`）；[assets/v18-methods/semigradient-values.png](../assets/v18-methods/semigradient-values.png) |
| 9.2 节“平均更新的向量场”；9.3 节“夹角为何小于直角”；课件 ch09-vector-field、ch09-why-converge | 平均更新 $\mathbf b_0-\mathbf A\mathbf w$ 的箭头图，箭头指向 TD 固定点 $(0,1/7)$；从四角出发的平均更新路径；最大夹角 $47^\circ$ | 本课的计算：主算例三组聚合特征下的 $\mathbf A,\mathbf b_0$，确定性平均更新迭代 | [demos/ch09_mechanisms.py](../demos/ch09_mechanisms.py) | [demos/ch09-mechanisms-results/results.json](../demos/ch09-mechanisms-results/results.json)（`mean_dynamics`） |
| 9.2 节“MC 投影、TD 固定点与学习曲线”；课件 course15-fa-learning、ch09-learned-values；9.3 节与自测题 6 | 学习曲线与学得价值：最终平均权重 MC $(-.568,-.002,.560)$、TD $(-.156,-.020,.130)$；平均价值 RMSE $.174$ 与 $.326$，解析参照 $.17359$ 与 $.32492$；误差界实测比值约 $3.50$；访问频率与解析 $\mu$ 的最大差约 $2.79\times10^{-4}$ | 本课的模拟：每次运行中每次访问 MC（步长 $1/N$）与半梯度 TD（步长 $.15/(1+N/1000)^{.65}$）读取相同轨迹，均从零开始，每次 12,000 回合，每 50 回合记录一次；独立重复 8 次，阴影为样本标准差。课件两张图（学习曲线、学得的预测）由第二个程序调用同一训练函数重画，独立重复 30 次，右端标注为解析误差 | [demos/course15_approximation.py](../demos/course15_approximation.py)；[demos/ch09_learning_figures.py](../demos/ch09_learning_figures.py)（课件图） | [assets/course15-fa/results.json](../assets/course15-fa/results.json)；[assets/course15-fa/learning-checkpoints.csv](../assets/course15-fa/learning-checkpoints.csv)；[assets/course15-fa/training-data.npz](../assets/course15-fa/training-data.npz)；[assets/course15-fa/learning.png](../assets/course15-fa/learning.png) ；[assets/ch09-revision/learning.png](../assets/ch09-revision/learning.png)、[assets/ch09-revision/values.png](../assets/ch09-revision/values.png)、[assets/ch09-revision/learning-30runs.json](../assets/ch09-revision/learning-30runs.json) |
| 9.2 节；9.4 节；9.6 节“一次共享更新怎样改变采样” | TD 固定点的 Bellman 目标与逐状态加权残差；精确投影算子迭代；两状态任务及平稳访问概率；行为状态权重与平均更新系数（$\alpha=.001$ 时同策略 $1-.4\alpha$、回报回归 $1-1.15\alpha$）；控制例中第二组右动作权重 $.1\to.3$，起点回报约 $-.9997\to.9997$ | 本课的计算：有限模型上的精确平均算子与解析评价，未训练智能体；控制例 $\alpha=.5,\varepsilon=.2$ | [demos/v19_approximation.py](../demos/v19_approximation.py) | [assets/v19-approximation/calculations.json](../assets/v19-approximation/calculations.json)；图 projection-balance、fixedpoint-map、deadly-task、deadly-gain、control-distribution（同目录） |
| 9.4 节“去掉一项”“临界概率”；课件 ch09-triad-minus-one、course24-triad-ablation | 两状态任务平均倍数：三项都有 $1.074$，去掉离策略 $.96$，去掉自举 $.885$，表格两个方向 $.905$ 与 $.9995$；临界概率 $p=1/3$ | 本课的计算：行为在两处选 $a_0$ 的概率 $.95$，$\alpha=.1$，精确期望更新 | [demos/ch09_mechanisms.py](../demos/ch09_mechanisms.py) | [demos/ch09-mechanisms-results/results.json](../demos/ch09-mechanisms-results/results.json)（`triad`） |
| 9.6 节“预测准确性与控制表现” | 单步决策两套估计：甲 $(.7,.6)$ 均方误差 $.065$、选 $a_1$；乙 $(.9,.95)$ 均方误差 $.01625$、回报降到 $.8$ | 本课的计算：两动作期望奖励 $1$ 与 $.8$，等权误差 | [demos/approximation_v9_walkthrough.py](../demos/approximation_v9_walkthrough.py) | [assets/v9-approximation/calculations.json](../assets/v9-approximation/calculations.json)（`control`）；[assets/v9-approximation/value-error-control.png](../assets/v9-approximation/value-error-control.png) |
| 9.6 节“参数资格迹”前的非线性例 | 一次运行中 $(w_1,w_2)$ 从 $(.2,.7)$ 学到约 $(1.115,1.053)$；第 16 格与第 4 格的梯度内积训练前 $-.168$、12,000 回合后 $-.524$ | 本课的模拟：两参数 tanh 预测器，只用实际退出回报作标签，每回合累计梯度除以 100 后更新；种子 0 的一次运行 | [demos/course15_approximation.py](../demos/course15_approximation.py) | [assets/course15-fa/results.json](../assets/course15-fa/results.json)（`neural`）；[assets/course15-fa/training-data.npz](../assets/course15-fa/training-data.npz)；[assets/course15-fa/neural-kernel.png](../assets/course15-fa/neural-kernel.png) |
| 9.5 节“半梯度、残差梯度和可获得的数据” | 后继特征等概率为 0 或 2 的例子：样本半平方损失的梯度乘积平均 $.5$，期望 TD 误差平方的梯度 $.25$ | 本课的计算：四种等概率配对的枚举 | [demos/approximation_v9_walkthrough.py](../demos/approximation_v9_walkthrough.py) | [assets/v9-approximation/calculations.json](../assets/v9-approximation/calculations.json)（`checks.double_sampling`） |
| 9.5 节“梯度TD与强调式TD”；课件 core-v8-offpolicy-experiment | 第 6,000 步按行为状态分布计算的价值 RMSE：TD $88.36$，GTD2 $.0659$，TDC $.0611$ | 本课的模拟：两状态任务，奖励恒为零，三种方法从 $w=1$ 出发并读取同一条行为轨迹，$\alpha=.001$，$\beta=.01$，$\mathbf h$ 初值为零，每次 6,000 步；独立重复 32 次，阴影为四分位带 | [demos/linear_offpolicy_prediction.py](../demos/linear_offpolicy_prediction.py) | [demos/linear-offpolicy-results/report.json](../demos/linear-offpolicy-results/report.json)；[demos/linear-offpolicy-results/mean-rmse.csv](../demos/linear-offpolicy-results/mean-rmse.csv)；[assets/v8-mechanisms/linear-offpolicy.pdf](../assets/v8-mechanisms/linear-offpolicy.pdf) |
| 9.5 节“最小二乘TD（LSTD）” | 两状态例的 LSTD 样本方程 $A=1.1,b=1$，解 $w\approx.909$，MC 解 $.95$ | 本课的计算：线性方程求解与零平均 TD 误差核对 | [demos/deep_v13_connections.py](../demos/deep_v13_connections.py) | [assets/deep-v13/checks.json](../assets/deep-v13/checks.json)（`lstd`） |
| 9.7 节“隐藏状态价值的不可辨识性” | 可见预测目标相同而隐藏状态真值不同的误差曲线 | 本课的计算：精确的可观测性算例，不含训练 | [demos/value_policy_mechanisms.py](../demos/value_policy_mechanisms.py) | [assets/v8-mechanisms/observable-objective.pdf](../assets/v8-mechanisms/observable-objective.pdf)；讲义用其 PNG 版 [assets/course15-fa/observable-objective.png](../assets/course15-fa/observable-objective.png) |
| 9.8 节“学右忘左”“SGD 与 Adam”；课件 ch09-net-forgetting、ch09-net-optimizer | 左半误差（4000 步 / 8000 步）：瓦片编码 $.048/.062$，傅里叶 5 阶 $.006/.189$，网络 SGD $.014/.156$，回放一半 $.014/.010$；Adam（$\eta=.003$）从 $.007$ 升到约 $.10$，之后在 $.07$ 附近；SGD 与 Adam 单步移动对照 | 本课的模拟：主算例，目标取真值，前 4000 步只更新左半 1–9，后 4000 步只更新右半 11–19；网络 32 个 tanh 隐单元，SGD 步长 $.02$；线性特征取 $\tau=20$；独立重复 20 次 | [demos/ch09_mechanisms.py](../demos/ch09_mechanisms.py) | [demos/ch09-mechanisms-results/results.json](../demos/ch09-mechanisms-results/results.json)（`two_stage`、`adam_scale`） |

运行：
```sh
python demos/course15_approximation.py
python3 demos/ch09_mechanisms.py
python demos/v19_approximation.py
python3 demos/deep_v13_connections.py
python demos/v18_methods.py
python demos/approximation_v9_walkthrough.py
python demos/value_policy_mechanisms.py
python demos/linear_offpolicy_prediction.py
```

外部代码与公开数据（出处）：Mountain Car 剩余代价曲面（Sutton 与 Barto，第 2 版，图 10.1，摘录于 assets/deep-v13/sutton-mountain-car-fig10-1.png 与 assets/ch09-revision/mountain.pdf）；Baird 反例（Sutton，RLSS Lecture 04-1）；投影几何原图（Sutton 与 Barto，图 11.3）；积木任务与属性规划原图（Zhang 等，Composable Planning with Attributes，图 1，由 demos/course_v12_visuals.py 按 `--source-crops` 裁取）。

## 第 10 章　深度价值学习 {#ch-10}

本章的单次更新与目标冻结算例、终止与截断的对照、最大化偏差、网格上 DQN 与表格 Q-learning 的对比、回放比与三次运行的统计，都来自本课的程序。DQN 原图、Rainbow 消融与 Seaquest 价值曲线取自原论文，不在表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 10.1 节“一条终止记录对共享预测的影响”；课件 deep-dqn-coordinate | 在 $(3,4)$ 向右进入终点的终止记录（标签 1）做一次 Adam 更新，所执行动作的输出从 $.02943$ 增至 $.04009$，其他三个输出与其他格的右动作值也因共享参数改变；有限差分核对共享输出权重的导数 | 本课的计算：一次随机初始化的 $22\to32\tanh\to4$ 网络，步长 $.001$，批次为同一条记录的 32 个副本，一次 Adam 更新，不刷新目标网络 | [demos/v18_methods.py](../demos/v18_methods.py) | [assets/v18-methods/report.json](../assets/v18-methods/report.json)；[assets/v18-methods/dqn-one-update.png](../assets/v18-methods/dqn-one-update.png) |
| 10.3 节“从精确最优性迭代到拟合 Q 迭代”“固定目标的梯度与整个Bellman残差的梯度”；课件 deep-dqn-fitted | 冻结目标一步：标签 $y=.14097$，更新前预测 $-.04082$，误差 $.18179$，更新后上动作预测 $.01171$；已知模型的同步 Bellman 更新；两状态例 $T_\pi Q_k=(1.8,1.8)$ 投影回直线得 $(1.6435,3.287)$，复制倍数 $1.6435$ | 本课的计算：已知模型的精确表格计算与加权投影回归，不训练网络；目标副本用独立数组保存 | [demos/v19_deep_value.py](../demos/v19_deep_value.py) | [assets/v19-deep-value/results.json](../assets/v19-deep-value/results.json)（`frozen_target`、`bellman_propagation`、`fitted_prediction`）；图 frozen-target-step、bellman-propagation、fitted-prediction 的 PNG 与 PDF 在同一目录 |
| 10.3 节“Q更新与行为概率” | 只更新被选动作的独立参数后，两组更新所得的行为概率 | 本课的计算：有限枚举，仅用 Python 标准库 | [demos/deep_v9_checks.py](../demos/deep_v9_checks.py)（`check_value_policy`） | 终端输出；加 `--json` 可写出 JSON |
| 10.3 节；延伸阅读“阅读与复算” | 固定目标外循环的复制序列（$w$：$1\to1.8\to\cdots$），固定目标梯度 $-.8$ | 本课的计算：有限算例，不训练网络 | [demos/deep_v10_derivations.py](../demos/deep_v10_derivations.py) | [assets/deep-v10/results.json](../assets/deep-v10/results.json)（`dqn`）；[assets/deep-v10/target-refresh.csv](../assets/deep-v10/target-refresh.csv) |
| 10.2 节开头的同一转移对照；10.1 节“改一格，动四格”“别的格为什么也动”“把表换成网络”（课件 ch10-matched-update、ch10-shared-write、ch10-bridge-naive） | 同一网格转移一次 SGD 后，表格与网络的预测：$\delta=+.162$，相关预测 $.4162,.4319,.6257$ 与 $-.2058,-.3017$，标签 $.562\to.587$，误差 $.130$ 与 $.155$ | 本课的计算：指定初始权重，网格环境、前向传播与损失梯度沿用本章网格实验 | [demos/dqn_matched_transition.py](../demos/dqn_matched_transition.py) | 终端输出 |
| 10.2 节“经验回放” | 八条记录前四条来自区域 A、后四条来自区域 B，批量为 2：按时间连续取两条时同区概率 $6/7$，独立均匀有放回地抽两次时为 $1/2$ | 本课的计算：枚举 7 个相邻对与 64 个有序对 | [demos/dqn_replay_pairs.py](../demos/dqn_replay_pairs.py) | 终端输出 |
| 课件 deep-v10-dqn-refresh | 目标副本重复复制后权重仍逐轮放大（复制倍数 $1.6435$），副本没有消除第 9 章两状态反例的发散 | 本课的计算：两状态预测例的精确加权回归与重复复制，特征、行为与目标策略同第 9 章，不训练环境；20 步路径用 `--mean-path --p .95 --copy-every 5` | [demos/course24_deep_coupling.py](../demos/course24_deep_coupling.py) | [assets/course24-deep/checks.json](../assets/course24-deep/checks.json)；[assets/course24-deep/fixed-target-outer-loop.pdf](../assets/course24-deep/fixed-target-outer-loop.pdf) |
| 10.2 节“终止、截断与自举目标”；10.5 节“一步与多步离策略控制”；课件 deep-16、core-v8-multistep-dqn | 两步决策树上三种末端处理学得的动作价值与贪心策略：正确目标 $Q(A,\text{继续})=.9\times3=2.7$，把截断写成终止得 $0$；两步回放的均值 $.9+1.8b_{\mathrm h}$ 与停止价值交于 $b_{\mathrm h}=1/18$ | 本课的模拟：A 停止得 $1$，继续得 $0$ 并到 B；B 取 $1$ 或 $3$ 后终止；$\gamma=.9$；三个学习器读同一批单步记录，左图前 100 条，右图用 320 条后学得的策略执行完整任务；回放概率取 $1/20$ 与 $1/18$ | [demos/fragment_control.py](../demos/fragment_control.py) | [assets/fragment-control/learning.csv](../assets/fragment-control/learning.csv)；[assets/fragment-control/learning.svg](../assets/fragment-control/learning.svg)；课件图 [assets/fragment-control/values-slide.pdf](../assets/fragment-control/values-slide.pdf) |
| 10.2 节“DQN 的小批量更新” | 0、1000、10000 次真实交互时的最大 Q、贪心箭头、实际执行路线与起点四项动作价值 | 本课的模拟：网格 DQN，学习率 $.001$，$\varepsilon$ 在 6000 步内从 1 降至 $.1$，每次训练 10000 次交互、9873 次批量更新、98 次目标复制；独立训练 5 次，图取其中种子 0 一次；本程序只读取保存的快照，不重新训练 | [demos/v19_deep_value.py](../demos/v19_deep_value.py)；训练见 [demos/dqn_model_v11.py](../demos/dqn_model_v11.py) | [assets/dqn-model-v11/grid-q-map.csv](../assets/dqn-model-v11/grid-q-map.csv)；[assets/v19-deep-value/results.json](../assets/v19-deep-value/results.json)（`learned_behavior`，含源文件校验值）；[assets/v19-deep-value/learned-value-policy.png](../assets/v19-deep-value/learned-value-policy.png) |
| 10.8 节“长序列探索与Bootstrapped DQN” | 十步任务的成功概率随探索方式变化的曲线 | 本课的计算：枚举有限结果，不训练智能体 | [demos/course_v12_visuals.py](../demos/course_v12_visuals.py) | [assets/course-v12/checks.json](../assets/course-v12/checks.json)；[assets/course-v12/exploration-probability.png](../assets/course-v12/exploration-probability.png) |
| 10.2 节“奖励缩放、裁剪与数值处理” | 方案 $(5,0)$ 与 $(2,2)$ 的回报 $5$ 与 $3.8$，符号裁剪后为 $1$ 与 $1.9$，偏好反转 | 本课的计算：两个确定性两步方案，折扣 $.9$ | [demos/deep_v13_connections.py](../demos/deep_v13_connections.py) | [assets/deep-v13/checks.json](../assets/deep-v13/checks.json)（`reward_clipping`）；[assets/deep-v13/reward-clipping.png](../assets/deep-v13/reward-clipping.png) |
| 10.7 节“观测窗口与序列回放”；课件 ch10-lamp | 只看最近 $k$ 帧时岔口处贪心策略选对的比例：$L<k$ 时为 1，$L\ge k$ 时为 $.5$ | 本课的模拟：T 形走廊，起点灯色红绿各半，$k\in\{1,2,4,8\}$，$L=1,\dots,10$，表格 Q 学习，每格 4000 回合 | [demos/ch10_mechanisms.py](../demos/ch10_mechanisms.py) | [demos/ch10-mechanisms-results/results.json](../demos/ch10-mechanisms-results/results.json)（`frames`） |
| 10.4 节开头；课件 deep-18；“方法对照、主线矛盾与自测” | A–B 任务：左动作真值 $-.1$，DQN 一步标签均值 $+.4$，偏差 $.5$，贪心策略以 $3/4$ 的概率选左；Double DQN 标签均值与选左概率 | 本课的计算：每个动作一次两点噪声观测，$\gamma=1$，按复制概率混合在线与目标估计，用分数精确枚举 | [demos/maximization_control.py](../demos/maximization_control.py)（调用 [demos/dqn_target_check.py](../demos/dqn_target_check.py) 的目标函数） | 终端输出 |
| 10.4 节“动作越多，偏差越大”；课件 ch10-max-k | $K$ 个无偏估计取最大的偏差（以 $\sigma$ 为单位）$.564,1.029,1.82,2.344$ 与 $\sqrt{2\ln K}$ 对照；真值 $0,-.5,-1,-1.5$ 时单估计标签均值 $+.479$，双估计 $-.367$ | 本课的计算：标准正态误差；双估计各取 $2\times10^5$ 次抽样 | [demos/ch10_mechanisms.py](../demos/ch10_mechanisms.py) | [demos/ch10-mechanisms-results/results.json](../demos/ch10-mechanisms-results/results.json)（`maxbias`） |
| 10.5 节“动作共享、回放分配与多步目标”；课件 deep-15；延伸阅读“阅读与复算” | 五条终止记录的优先回放与重要性校正，校正后恢复 $+.10$；所选输出回归梯度的有限差分检查；最大化偏差、终止与截断、Double DQN 目标的枚举 | 本课的计算：精确的 DQN 机制，仅用 Python 标准库，不训练网络 | [demos/dqn_target_check.py](../demos/dqn_target_check.py) | 终端输出 |
| 课件 core-v8-per、core-v8-quantile；10.5、10.6 节 | 回放修正算例；C51 投影；精确分位数损失；100 组概率质量检查 | 本课的计算：有限算例 | [demos/value_policy_mechanisms.py](../demos/value_policy_mechanisms.py) | [assets/v8-mechanisms/replay-correction.pdf](../assets/v8-mechanisms/replay-correction.pdf)；[assets/v8-mechanisms/quantile-loss.pdf](../assets/v8-mechanisms/quantile-loss.pdf)；[assets/v8-mechanisms/categorical-projection.pdf](../assets/v8-mechanisms/categorical-projection.pdf) |
| 10.6 节“C51的交叉熵梯度与动作选择”；课件 deep-v10-c51-action | 三原子 C51 一次更新：目标质量 $(0,.25,.75)$，更新后概率 $(.2272,.2918,.4810)$，均值 $.2538$，对照动作 $.15$ | 本课的计算：有限算例 | [demos/deep_v10_derivations.py](../demos/deep_v10_derivations.py) | [assets/deep-v10/c51-update.csv](../assets/deep-v10/c51-update.csv)；[assets/deep-v10/results.json](../assets/deep-v10/results.json)（`c51`） |
| 10.10 节开头；课件 dqn-v11-learning、dqn-v11-maps | 10000 步时 DQN 与表格 Q-learning 的平均评价回报均为 $.8484$，动作价值平均绝对误差 $.00455$ 与 $.03954$；种子 0 在 750 到 1000 步间误差 $.239\to.083$，选对最优动作的状态 $18/21\to19/21$，到达终点的起点 $19/21\to15/21$，折扣回报 $.709\to.447$；第 1000 步起点最大估值 $.445$、实际回报 $.680$，$(3,3)$ 处向上与向左估值 $.9480,.9888$，64 步回报 $-.572$；$(1,2)$ 处 $2\bar\xi_s$ 在 1000 步与 10000 步为 $.13406,.01064$；三条贪心路线图 | 本课的模拟：22 状态 one-hot 输入，32 个 tanh 隐单元，4 个输出，Adam $.001$，回放池 2000，预热 128，批量 32，每条转移更新一次，每 100 次更新复制目标；表格 Q-learning 每条转移在线更新一次，$\alpha=.2$；$\gamma=.97$，评价窗口 64 步；独立重复 5 次（种子 0–4），每次 10000 步；$2\bar\xi_s$ 由保存的 Q 表与精确 $q_*$ 相减得到 | [demos/dqn_model_v11.py](../demos/dqn_model_v11.py)；路线图 [demos/course32_navigation_figure.py](../demos/course32_navigation_figure.py)；策略读出 [demos/grid_policy_readout.py](../demos/grid_policy_readout.py) | [assets/dqn-model-v11/results.json](../assets/dqn-model-v11/results.json)（`grid`）；[assets/dqn-model-v11/grid-evaluations.csv](../assets/dqn-model-v11/grid-evaluations.csv)；[assets/dqn-model-v11/grid-q-map.csv](../assets/dqn-model-v11/grid-q-map.csv)；[assets/dqn-model-v11/grid-weights.npz](../assets/dqn-model-v11/grid-weights.npz)；[assets/dqn-model-v11/policy-readout.json](../assets/dqn-model-v11/policy-readout.json)（`optimal`、`scores`）；[assets/dqn-model-v11/grid-learning.png](../assets/dqn-model-v11/grid-learning.png)；[assets/course32-methods/greedy-route.pdf](../assets/course32-methods/greedy-route.pdf) |
| 10.10 节“DeadlineChain实验”；课件 deep-51 | DQN 与 Double DQN 的冻结策略评价曲线，阴影为 5 次训练之间的样本标准差 | 本课的模拟：5 个位置，输入含剩余时限，12 步真实期限，1200 次训练交互；每次 585 次梯度更新、12 次目标同步；独立重复 5 次；每个训练产物另做 12 次冻结策略评价 | 训练程序暂未收入本附录 | [assets/deep/results/provenance.json](../assets/deep/results/provenance.json)；逐次记录 assets/deep/results/deep-dqn-seed-0.csv 至 seed-4，deep-double_dqn-seed-0.csv 至 seed-4；课件曲线读 [assets/deep/results/deep-dqn.dat](../assets/deep/results/deep-dqn.dat) 与 [assets/deep/results/deep-double_dqn.dat](../assets/deep/results/deep-double_dqn.dat) |
| 10.9 节“每步更新几次”；课件 ch10-replay-ratio | 回放比 1、2、4、8、16 时 1500 步得分 $.651,.924,.975,.974,.962$，得分到 $.9$ 的步数 $>1500,1300,700,500,400$ | 本课的模拟：十个随机 $7\times7$ 迷宫，各 12 堵墙，最短路 12 步；表格 Q 学习，$\gamma=.97$，步长 $.5$，$\varepsilon=.1$；每步先用当前转移更新一次，再从池中均匀抽其余几条；每个回放比 10 个任务各运行 8 次 | [demos/ch10_mechanisms.py](../demos/ch10_mechanisms.py) | [demos/ch10-mechanisms-results/results.json](../demos/ch10-mechanisms-results/results.json)（`replay_ratio`） |
| 10.10 节“三次运行够不够”；课件 ch10-iqm | 回放比 4 与 8 在 3 次与 20 次运行下的均值、中位数、IQM 及 95% 区间；六组三次运行的均值差 $.286,.298,.415,.236,.342,.195$，20 次合计 $.291$ | 本课的模拟：同一组迷宫，走 400 步后评价，每种回放比独立重复 20 次；分层自助法，任务内重抽运行，2000 次 | [demos/ch10_mechanisms.py](../demos/ch10_mechanisms.py) | [demos/ch10-mechanisms-results/results.json](../demos/ch10-mechanisms-results/results.json)（`aggregates`） |

运行：
```sh
python demos/v18_methods.py
python demos/v19_deep_value.py
python3 demos/deep_v9_checks.py
python3 demos/deep_v10_derivations.py
python3 demos/dqn_matched_transition.py
python3 demos/dqn_replay_pairs.py
python3 demos/course24_deep_coupling.py
python demos/fragment_control.py --replay-probability 1/20
python demos/fragment_control.py --replay-probability 1/18
python3 demos/course_v12_visuals.py
python3 demos/deep_v13_connections.py
python3 demos/ch10_mechanisms.py
python3 demos/maximization_control.py
python3 demos/dqn_target_check.py
python demos/value_policy_mechanisms.py
python3 demos/dqn_model_v11.py
python3 demos/dqn_model_v11.py --test-only
python demos/course32_navigation_figure.py
python demos/grid_policy_readout.py
```

外部代码与公开数据（出处）：DQN 网络结构与 Atari 结果原图（Mnih 等，Nature 2015，图 1，assets/machado/dqn-nature2015-fig1.png）；Rainbow 消融曲线（Hessel 等，2018，assets/course31-deep/rainbow-ablation.png）；Seaquest 价值曲线（assets/course31-deep/seaquest-value.png）；DQN 表示图（assets/v17-background/dqn-representation.pdf）；Atari 100k 上 SPR 重置前后的 IQM $.380\to.478$（Nikishin 等，2022）。

## 第 11 章　策略梯度与行动者–评论者 {#ch-11}

本章的短走廊与一位记忆实验、两步任务上的 REINFORCE、位置控制任务上的 PPO 与 SAC，以及 TRPO、PPO、确定性策略梯度、最大熵控制的各个小算例，都来自本课的程序；其中神经网络训练需要 PyTorch，见上文运行环境。TD3 消融表、soft Q 迷宫图与 SAC 人形机器人画面取自原论文和作者博客，不在表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 11.1 节（短走廊） | 按右初始概率 $p=.25$ 与 $.80$ 两组训练后的期望步数 $11.71$ 与 $11.80$；同一策略在各格的按键价值 | 本课的模拟：Sutton 与 Barto 例 13.1 的短走廊；每 40 回合平均一次 REINFORCE 更新，步长 $.018$，logit 限于 $[-3,3]$，策略不读位置；每次 7200 回合，独立重复 8 次；评价用真实转移方程精确求期望 | [demos/short_corridor.py](../demos/short_corridor.py) | [assets/short-corridor/training.csv](../assets/short-corridor/training.csv)；[assets/short-corridor/learning.svg](../assets/short-corridor/learning.svg)；[assets/short-corridor/policy-class.pdf](../assets/short-corridor/policy-class.pdf) |
| 11.1 节（一位记忆） | 无记忆与一位记忆策略的期望步数 $11.70$ 与 $4.48$；首步必打滑时 $12.70$ 与 $6.18$；达到同样回合数用去的真实动作约 $28{,}303$ 与 $14{,}882$ | 本课的模拟：同一短走廊，初始按右概率均为一半，每 40 回合更新一次；每次 2400 回合，独立重复 8 次；“上一键记忆”与“首步打滑”是课堂变体 | [demos/corridor_memory.py](../demos/corridor_memory.py) | [assets/corridor-memory/training.csv](../assets/corridor-memory/training.csv)；[assets/corridor-memory/reader.json](../assets/corridor-memory/reader.json)（`summary`）；[assets/corridor-memory/learning.svg](../assets/corridor-memory/learning.svg) |
| 11.1 节“两步决策任务”；11.2 节；11.3 节开头；课件 sample14-pg-task 至 sample14-pg-critic-direction | 三条轨迹对梯度均值的贡献；一回合高奖轨迹的单次更新（$p,q$ 由 $.5,.25$ 变为 $.534,.290$，$J$ 由 $1.175$ 变为 $1.225$）；自动微分的负损失方向与显式梯度一致；训练后 12 次运行的期望回报平均 $2.659$（初值 $1.175$，最优 $2.7$）；后继价值误差改变更新方向的曲线 | 本课的模拟：两步任务，$\gamma=.9$，初始 $p=.5,q=.25$；每批 32 个完整回合更新一次，步长 $.2$，运行 300 批（每次 9600 回合），独立重复 12 次；评价用已知模型精确计算，不反馈给学习器 | [demos/sample14_pg.py](../demos/sample14_pg.py) | [assets/sample14-pg/results.json](../assets/sample14-pg/results.json)；逐次曲线 assets/sample14-pg/seed-0.npy 至 seed-11.npy；图 [assets/sample14-pg/enumeration.png](../assets/sample14-pg/enumeration.png)、[behavior.png](../assets/sample14-pg/behavior.png)、[learning.png](../assets/sample14-pg/learning.png)、[critic-error.png](../assets/sample14-pg/critic-error.png) |
| 课件 sample14-pg-enumerate；11.4 节开头与“TRPO的完整更新顺序”；课件 course28-trpo-algorithm；11.5 节“三种步长对照”（课件 course22-trpo-summary） | 两步树的轨迹枚举与梯度；候选策略（继续 $.5\to.9$，取 3 的概率 $.25\to.10$）：起点项 $.35$ 与 $.14$，$s_1$ 处即时奖励减少 $.30$；条件动作价值 $1.08$，取到 3 的概率 $.125\to.09$（只换末动作为 $.05$）；回溯线搜索各点 | 本课的计算：精确枚举，无采样 | [assets/course38-policy/compare_steps.py](../assets/course38-policy/compare_steps.py) | 终端输出；[assets/course38-policy/compare-steps.pdf](../assets/course38-policy/compare-steps.pdf) |
| 11.3 节；课件 sample14-pg-baseline | 基线对梯度条件方差的影响 | 本课的计算：两步任务的轨迹概率枚举，不采样、不训练 | [demos/ch11_pg_signals.py](../demos/ch11_pg_signals.py) | 终端输出 |
| 11.3 节；课件 core-v8-baseline-optimum | 常数基线与最小方差基线的方差曲线 | 本课的计算：有限算例 | [demos/value_policy_mechanisms.py](../demos/value_policy_mechanisms.py) | [assets/v8-mechanisms/baseline-variance.pdf](../assets/v8-mechanisms/baseline-variance.pdf) |
| 11.3 节“共享表示下的策略与价值梯度”；第 11 章补充阅读“行动者与评论者的资格迹” | 同一参数上价值损失反向改变动作概率；行动者与评论者两组迹的一步更新 | 本课的计算：单参数算例与有限差分（`shared_actor_critic`）；资格迹见函数 `actor_critic_trace_step` | [demos/deep_v13_connections.py](../demos/deep_v13_connections.py) | [assets/deep-v13/checks.json](../assets/deep-v13/checks.json)（`shared_actor_critic`、`n_step_and_ac`）；[assets/deep-v13/shared-encoder.png](../assets/deep-v13/shared-encoder.png) |
| 11.3 节；课件 deep-35、deep-36 | 三个转移的 GAE 逆序递推、终止与截断的尾值、PPO 概率比与分段梯度 | 本课的计算：固定的三转移片段，不训练；`--test` 做断言检查 | [demos/gae_ppo_walkthrough.py](../demos/gae_ppo_walkthrough.py) | 终端输出（JSON）；图 [assets/v5/deep/gae-ppo-walkthrough.svg](../assets/v5/deep/gae-ppo-walkthrough.svg) 没有绘图程序，图中数值（$\gamma=1$、$\lambda=.5$ 的 $\delta$、优势、目标与概率比）由本程序核对，来源与校验值见 [assets/v5/deep/sources.json](../assets/v5/deep/sources.json) |
| 11.4 节“TRPO：从访问误差到分布变化约束”；课件 course22-trpo-opening、deep-38、deep-pg-kl-geometry | 两步树上真实回报、局部代理与切线的山面、截面与 KL 信赖域 | 本课的计算：精确计算与等高线，标出回溯点 | [assets/course38-policy/trpo_landscape.py](../assets/course38-policy/trpo_landscape.py) | [assets/course38-policy/trpo-hill.pdf](../assets/course38-policy/trpo-hill.pdf)；[trpo-section.pdf](../assets/course38-policy/trpo-section.pdf)；[trpo-trust.pdf](../assets/course38-policy/trpo-trust.pdf) |
| 11.4 节“TRPO：从访问误差到分布变化约束”；第 11 章补充阅读“随机转移：不能把好运气当成可控制变量”；11.9 节“SAC的一次更新计算”；课件 sample14-sac-summary | 真实 KL 边界与局部二次近似、Fisher 与回溯；PPO 裁剪梯度；控制即推断的轨迹 KL 展开（真实转移与直接条件化之差）；SAC 显式密度与动作两条导数路径 | 本课的计算：轨迹枚举、有限差分与数值积分，不训练，不读也不覆盖已有训练结果 | [demos/v19_policy_gradient.py](../demos/v19_policy_gradient.py) | [assets/v19-policy-gradient/checks.json](../assets/v19-policy-gradient/checks.json)（`pg`、`trpo`、`ppo`、`control_as_inference`、`sac`）；[trpo-geometry.png](../assets/v19-policy-gradient/trpo-geometry.png)、[cai-dynamics.png](../assets/v19-policy-gradient/cai-dynamics.png)、[sac-paths.png](../assets/v19-policy-gradient/sac-paths.png) |
| 11.5 节“PPO：裁剪代理与多轮一阶优化”“例：同批两次更新”；课件 deep-pg-ppo-snapshot | 同一批样本上两种有限策略更新的代理值与真实回报；梯度的有限差分核对 | 本课的计算：两步 MDP 的枚举，仅用 Python 标准库 | [demos/ch11_trust_update.py](../demos/ch11_trust_update.py) | 终端输出 |
| 11.5 节“PPO：裁剪代理与多轮一阶优化” | 裁剪代理 $-.8\max(d,-.1)+.9\min(d,.1)$ 在 $d=.1$ 处取最大，$p=.40$；起点损失 $.08$，旧访问计入 $.09$，真实只得 $.072$ | 本课的计算：两步决策树的精确回报、旧策略代理与 PPO-Clip，裁剪宽度 $.2$；共享参数例用 `--p 41/100`，独立概率例用 `--candidate .58 .22` | [demos/ppo_shared_tree.py](../demos/ppo_shared_tree.py) | 终端输出 |
| 11.5 节“PPO的位置控制任务与实现”；课件 ppo-v11-code、ppo-v11-task、sample14-sac-temperature | PPO 三次训练的最终外部折扣回报 $-.2473,-.2535,-.2507$；学到的动作分布与价值；温度调节页所用的 10000 步 SAC 对照 | 本课的模拟：12 步位置控制，状态含剩余时间，$\gamma=.97$；行动者与评论者各为两层 32 单元 tanh 网络，不共享参数；裁剪 $[.8,1.2]$，小批量 96 条；每次 100 次更新、38{,}400 次真实转移；独立重复 3 次（种子 0、1、2）；评价冻结随机策略，独立随机流 128 回合 | [demos/ppo_sac_v11_lab.py](../demos/ppo_sac_v11_lab.py) | [assets/ppo-sac-v11/summary.json](../assets/ppo-sac-v11/summary.json)（`ppo`）；[run-config.json](../assets/ppo-sac-v11/run-config.json)；[math-checks.json](../assets/ppo-sac-v11/math-checks.json)；权重与曲线 ppo-seed-0.pt 至 seed-2，sac-seed-0.pt 至 seed-2；[policy-value-data.npz](../assets/ppo-sac-v11/policy-value-data.npz)；[ppo-policy-value.png](../assets/ppo-sac-v11/ppo-policy-value.png) |
| 11.5 节“PPO的位置控制任务与实现”；课件 ppo-v11-learning、ppo-v11-value | 一次典型运行（种子 2）首批第 5 轮：裁剪代理相对初值 $+.969$，同一起点的真实回报 $-.098$；旧访问频率下未裁剪代理 $+.484$、裁剪代理 $-.248$；三次运行的学习曲线与训练后轨迹 | 本课的模拟：训练与种子同上一行；评价器按动态规划对全部动作路径求和，起点取该批观测到的 32 个起点 | [demos/ppo_epoch_audit.py](../demos/ppo_epoch_audit.py) | [assets/ppo-epochs/epochs.csv](../assets/ppo-epochs/epochs.csv)；[ppo-update.png](../assets/ppo-epochs/ppo-update.png)；[epoch.png](../assets/ppo-epochs/epoch.png)、[positions.png](../assets/ppo-epochs/positions.png)、[training.png](../assets/ppo-epochs/training.png) |
| 11.5 节“逐状态的 KL 正则改进及其算法近似”；11.6 节“连续动作上求不准最大”；11.6 节“把噪声收到零”；11.7 节“探索噪声与目标副本”；11.7 节“行动者专找评论者的错”；11.8 节“保留随机”；课件 ch11-one-formula、ch11-max-grid、ch11-dpg-limit、ch11-ddpg-parts、ch11-ripple-chase、ch11-keep-random | $q=(0,1,2)$、旧策略均匀时：$\eta=\tfrac13$ 期望 $1.22$、KL $.036$，$\eta=1$ 期望 $1.58$、KL $.27$，$\eta\to\infty$ 期望 $2$、KL $\ln3$；连续动作取最大的高估随候选数增长；得分函数单样本方差 $.7056/\sigma^2+15\sigma^2-3.76$（$\sigma=.5,.3,.1$ 时约 $2.8,5.4,67$）；波纹评论者使目标高出 $.05$，为实际损失的 25 倍，$\gamma=.99$ 时累计至 $5$；$\kappa=.2$ 比 $.1$ 每步少得 $.017$ | 本课的计算：六组有限算例，打印的每个数都出现在课件或讲义中 | [demos/ch11_open_numbers.py](../demos/ch11_open_numbers.py) | 终端输出 |
| 11.7 节“例：数值准，斜率错”“TD3 的目标值”“行动者专找评论者的错”；课件 deep-continuous-slope、ch11-td3-target | 确定性策略的一步斜率；两条构造估值曲线上的 TD3 目标与噪声积分 | 本课的计算：解析曲线与有限差分；`--figures 目录` 写出课件图 | [demos/ch11_deterministic_policy.py](../demos/ch11_deterministic_policy.py) | 终端输出；[assets/ch11-policy/dpg-step.pdf](../assets/ch11-policy/dpg-step.pdf)；[assets/ch11-policy/td3-target.pdf](../assets/ch11-policy/td3-target.pdf) |
| 课件 ch11-policy-simplex、ch11-performance-identity；11.8 节“两种改进准则”；11.10 节“从局部到全程” | 同一组动作价值在概率单纯形上的约束解与软最优解；局部改善量与全程回报（普通与最大熵目标） | 本课的计算：精确验算；`--figure PATH.pdf` 写出课件图 | [demos/ch11_policy_improvement.py](../demos/ch11_policy_improvement.py) | 终端输出；[assets/ch11-policy/improvement-simplex.pdf](../assets/ch11-policy/improvement-simplex.pdf) |
| 课件 ch11-policy-comparison-case | 两动作情形下代理与目标的三幅对照图 | 本课的计算：精确计算；`--figure PATH.pdf` 重绘 | [demos/ch11_policy_objectives.py](../demos/ch11_policy_objectives.py) | 终端输出；[assets/ch11-policy/terminal-policy.pdf](../assets/ch11-policy/terminal-policy.pdf) |
| 第 11 章补充阅读“路口拼接”“两轮价值更新”；课件 ch11-soft-stitch、ch11-soft-stitch-backup | 两条次优记录上两轮 Bellman 同步更新得到的策略概率与精确评价 | 本课的计算：确定性两步 MDP，学习器只看四条记录，环境只用于训练后评价 | [demos/ch11_soft_stitch.py](../demos/ch11_soft_stitch.py) | 终端输出 |
| 课件 ch11-operators-case | 同一转移、已知末步评论者下三种备份目标 | 本课的计算：末步奖励 $1-a^2$，离散动作集含连续曲线的最大点，SAC 用无界高斯动作；不训练 | [demos/ch11_control_operators.py](../demos/ch11_control_operators.py) | 终端输出 |
| 11.8 节“例：两动作的软最优”；课件 sample14-sac-entropy | 最大熵控制中的两动作算例 | 本课的计算：仅用 Python 标准库 | [demos/soft_control_choice.py](../demos/soft_control_choice.py) | 终端输出 |
| 11.9 节“SAC 的连续位置控制任务”“SAC 的完整更新顺序”“SAC 的训练结果”；11.8 节“软 Bellman 方程”“软策略改进”；课件 sample14-sac-task 至 sample14-sac-learning | 固定动作价值与不同温度的最优分布；三次训练的最终外部折扣回报 $-.2856,-.2829,-.2838$；零动作 $-3.4803$，均匀动作 $-5.2282$，已知动力学的反馈控制器 $-.2436$；从 $x=.8$ 执行 20 个回合的轨迹与动作分布 | 本课的模拟：12 步位置控制；两个 Q 网络与策略网络各为两层 32 单元 tanh；前 500 步均匀动作，此后每步抽 128 条回放更新一次（每次 7501 次梯度更新）；每次 8000 条真实转移，独立重复 3 次（种子 0、1、2）；评价冻结随机策略，独立 256 回合（种子 9001），不含熵奖励 | [demos/sample14_sac.py](../demos/sample14_sac.py) | [assets/sample14-sac/results.json](../assets/sample14-sac/results.json)；曲线 curve-0.npy 至 curve-2.npy，权重 initial-0.pt 至 learned-2.pt；[entropy-choice.png](../assets/sample14-sac/entropy-choice.png)、[learning.png](../assets/sample14-sac/learning.png)、[behavior.png](../assets/sample14-sac/behavior.png) |
| 11.9 节“SAC的回放动作与当前策略动作” | 旧动作 $-.4$ 使位置 $.8\to.7$，奖励 $-.4948$；在 $s$ 新采 $-.9529$ 供行动者更新，在 $s'$ 新采 $-.8347$ 供目标计算；目标独立复算 $-.54965$ | 本课的计算：取自 sample14_sac.py 的一次演示运行（种子 7），不重新训练 | [demos/v18_methods.py](../demos/v18_methods.py) | [assets/v18-methods/report.json](../assets/v18-methods/report.json)（`sac_queries`）；[assets/v18-methods/sac-three-actions.png](../assets/v18-methods/sac-three-actions.png) |
| 11.9 节“数值核对”；延伸阅读“阅读与复算” | 轨迹对数策略梯度、因果性与占用；动作求导路径、tanh 密度与温度方向 | 本课的计算：构造的两步 MDP 枚举与有限差分；两步位置控制的固定评论者与路径导数；均不训练 | [demos/policy_gradient_check.py](../demos/policy_gradient_check.py)；[demos/continuous_control_walkthrough.py](../demos/continuous_control_walkthrough.py) | 终端输出（后者默认输出 JSON，`--test` 做断言） |

运行：
```sh
python3 demos/short_corridor.py --action-values
python demos/short_corridor.py --output results/short-corridor
python3 demos/corridor_memory.py --output results/corridor-memory
python demos/sample14_pg.py --torch-check
python3 assets/course38-policy/compare_steps.py
python3 assets/course38-policy/trpo_landscape.py
python3 demos/ch11_pg_signals.py
python demos/value_policy_mechanisms.py
python3 demos/deep_v13_connections.py
python3 demos/gae_ppo_walkthrough.py --test
python3 demos/v19_policy_gradient.py
python3 demos/ch11_trust_update.py
python3 demos/ppo_shared_tree.py
python3 demos/ppo_sac_v11_lab.py --check
python3 demos/ppo_sac_v11_lab.py --train --plot --seeds 0 1 2
python demos/ppo_epoch_audit.py
python3 demos/ch11_open_numbers.py
python3 demos/ch11_deterministic_policy.py
python3 demos/ch11_policy_improvement.py
python3 demos/ch11_policy_objectives.py
python3 demos/ch11_soft_stitch.py
python3 demos/ch11_control_operators.py
python3 demos/soft_control_choice.py
python demos/sample14_sac.py --steps 8000 --seeds 0 1 2
python demos/v18_methods.py
python3 demos/policy_gradient_check.py
python3 demos/continuous_control_walkthrough.py --test
```

外部代码与公开数据（出处）：TD3 作者实现 TD3.py（Fujimoto 等，github.com/sfujim/TD3）与 TD3 消融表（Fujimoto 等，2018）；Spinning Up 的 trpo.py、core.py、ppo.py（OpenAI Spinning Up，PyTorch 版）；soft Q 学习的迷宫与动作密度图（BAIR 博客，assets/ch11-policy/bair-soft-open.png、bair-soft-maze.png、bair-soft-density.png）；SAC 人形机器人画面（Haarnoja 等，assets/course31-deep/sac-humanoid.png）。

## 第 12 章　经验覆盖、模型规划与大规模训练 {#ch-12}

本章来自本课程序的结果有：四道门走廊上的三组算例（固定数据、模型规划与数据流调度），离线评价与改进的小算例，一维位置控制上的模型拟合与模型预测控制，递归与直接多步预测的比较，V-trace 单批更新，FIFO 队列，以及多人博弈的有限算例。Dyna 结构图、IMPALA 示意图、OpenAI Five 的滞后与复用曲线和 GEAR 吞吐图取自原课件与原论文，不在表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 12.1 节开头；12.2 节表格与 CQL 段落；课件 ch12-corridor-data、deep-offline-worlds、deep-49、offline-support、frontier-v8-cql-derivation、ch12-cql-numbers、deep-offline-iql、frontier-v8-iql-derivation、deep-v10-offline-extract、ch12-offline-policy | 150 个完整回合、350 条转移的计数；四种方法的前进概率与入口回报：普通贪心（未见值 $u=5$）$1.6384$ / $0$，支持内贪心 $1$ / $1$，表格 CQL $.512$ / $.512$，表格 IQL（前进概率 $.657,.550,.733,0$）$.777$ / $.777$；CQL 末门未见动作的估值由 $5$ 降到 $-2.877$ | 本课的计算：四道门走廊，通过率 $.8$，末门奖励 $B=4$ 与 $B=0$ 两个设定；训练只读计数，真实奖励与通过率只用于评价；表格 CQL 系数 $.25$、步长 $.2$、全批 $10^4$ 步、目标每 20 步复制一次；IQL 取 $\tau=.75$、$\beta=3$ | [demos/ch12_fixed_corridor.py](../demos/ch12_fixed_corridor.py) | 终端输出 |
| 12.1 节选读“留出 TD 损失与价值误差”；课件 course-v12-offline-validation | 候选 A（真值）留出 TD 损失 $.729$，候选 B（全零）$.2$；平方 Bellman 残差与目标方差的分解 | 本课的计算：三状态有限分支逐项枚举，$\gamma=.9$，验证状态分布 $(.9,.05,.05)$；不做离线训练 | [demos/course_v12_visuals.py](../demos/course_v12_visuals.py) | [assets/course-v12/checks.json](../assets/course-v12/checks.json)（`offline_validation`）；[assets/course-v12/offline-validation.png](../assets/course-v12/offline-validation.png) |
| 12.1 节“只评价也要覆盖”；课件 ch12-eval-coverage、ch12-eval-two | 评价 $\pi_3$ 的重要性权重 $1.92$ 与估计 $.512$；八道门时单条权重 $5.96$ 与 $256$、单条估计标准差约 $.99$ 与 $6.55$；拟合 Q 评价在不同未见值下的结果 | 本课的计算：由走廊原始计数精确求和，八道门部分用解析期望与二阶矩 | [demos/ch12_open_numbers.py](../demos/ch12_open_numbers.py) | 终端输出 |
| 12.2 节延伸阅读（CQL 梯度与 IQL 提取）；图 offline-support-objectives | 第三个未见动作在 $Q=(0,2,4)$ 下的 CQL 梯度与一次更新；$\tau=.75$ 时 $V=1.5$；频率 $(.9,.1)$ 时提取概率 $(.5491,.4509)$，回报由 $.2$ 变为 $.9017$ | 本课的计算：给定的四条轨迹与 Q 快照，不随机采样、不与环境交互、不训练网络 | [demos/offline_support_walkthrough.py](../demos/offline_support_walkthrough.py) | 终端输出（JSON）；[assets/v5/deep/offline-support-objectives.svg](../assets/v5/deep/offline-support-objectives.svg) 没有绘图程序，图中 CQL 与 IQL 的数值由本程序核对；频率 $(.9,.1)$ 一行不在默认输出中，按提取概率正比于频率乘 $e^{\beta(Q-V)}$ 手算；[assets/v5/deep/sources.json](../assets/v5/deep/sources.json) |
| 12.2 节“优势加权、条件模仿与同一把尺子”；课件 ch12-awr-beta、ch12-dt-luck、ch12-score-table | AWR：$\beta=0$ 回报 $.667$，$\beta=10$ 起点前进概率 $.084$、回报 $.982$；决策 Transformer 在 $x_0$ 的前进概率 $.75$ 与数据内成功比例 $.6$，回报 $.719$；两个世界中较差回报的排序（行为克隆 $.667$ 至支持内贪心 $1$） | 本课的计算：以行为策略的价值作优势，由走廊计数精确计算 | [demos/ch12_open_numbers.py](../demos/ch12_open_numbers.py) | 终端输出 |
| 12.3 节开头与图“始终前进的回报与门数”；12.4 节表格；课件 deep-48、ch12-gate-fit、ch12-gate-arrival、model-horizon、ch12-gate-decision、mpc-search、ch12-gate-execution | 校准估计 $\widehat p=.9$；成功出关概率高估 $.246$，四道门回报差 $.986$；门槛 $4^{-1/h}$ 为 $.7071$ 与 $.8409$；四道门全长规划分数 $2.6244$、真实回报 $1.6384$、独立执行均值 $1.6300$（标准误 $.0197$）；八道门 $1.7219$、$.6711$、$.6752$（$.0150$） | 本课的模拟：每道门真实通过率 $.8$，校准记录十次通过九次，最大似然拟合；每种门数模拟 10000 个独立回合，同一门数的各策略共用环境随机数（种子 $12+$门数） | [demos/ch12_gate_planning.py](../demos/ch12_gate_planning.py) | 终端输出；12.3 节的图“始终前进的回报与门数”用课件 ch12-gate-decision 的页内重画 [assets/slide-figs/ch12-gate-decision.pdf](../assets/slide-figs/ch12-gate-decision.pdf)；`--figure` 仍可重绘旧图 assets/ch12-gates/gate-horizon.pdf，课件与阅读稿已不引用 |
| 第 12 章补充阅读“位置控制中的模型与规划”之“最小二乘模型估计”；课件 model-v11-task | 条件均值 RMSE 随数据量的曲线；一次典型运行的估计系数 $(.8506,.5992,.1495)$ | 本课的模拟：线性位置动力学，真实系数 $(.85,.6,.15)$，随机动作，每 20 步在 $[-2,2]$ 内重置位置，240 条真实转移，最小二乘拟合；独立重复 10 次，真值只用于评价与绘图 | [demos/dqn_model_v11.py](../demos/dqn_model_v11.py) | [assets/dqn-model-v11/results.json](../assets/dqn-model-v11/results.json)（`model`）；[assets/dqn-model-v11/model-fit-curve.csv](../assets/dqn-model-v11/model-fit-curve.csv)；[assets/dqn-model-v11/model-real-transitions.csv](../assets/dqn-model-v11/model-real-transitions.csv)；[assets/dqn-model-v11/model-map.csv](../assets/dqn-model-v11/model-map.csv)；[assets/dqn-model-v11/model-learning.png](../assets/dqn-model-v11/model-learning.png) |
| 第 12 章补充阅读“位置控制中的模型与规划”之“规划查询与模型外推”；课件 deep-v13-model-selection | 无截距拟合斜率 $.89928$；规划选 $a=1.5$，预测奖励约 $1.349$、真实 $-1.875$；限于已采范围选 $.4$，真实 $.336$；真实最优 $a\approx.577$、奖励约 $.385$ | 本课的计算：真实位移 $a-a^3$，在 $[0,.4]$ 均匀取 21 个动作拟合线性模型，再在 $[0,1.5]$ 中选择动作 | [demos/deep_v13_connections.py](../demos/deep_v13_connections.py) | [assets/deep-v13/checks.json](../assets/deep-v13/checks.json)（`model`）；[assets/deep-v13/planning-distribution.png](../assets/deep-v13/planning-distribution.png) |
| 12.3 节“多步模型误差的传播”；第 12 章补充阅读“位置控制中的模型与规划”之“两步动作序列的手算”；课件 model-v11-control | 偏置错写时的位置差 $.450,.833,1.158,1.434$；$H=1,2,4$ 时冻结模型的变化后每步代价 $.4227,.4645,.5734$，已知真实模型 $.1109,.1049,.1049$；第 80 步典型运行（$x=.2115$，计划 $(-1,0,0,0)$，预测第四步 $.2188$、预测总代价 $.284$，实际第四步 $-1.1449$、总代价 $3.600$）；每四步执行整段计划的代价 $1.0823$ | 本课的模拟：位置控制，第 80 步外力偏置由 $.15$ 变为 $-.30$；每次运行从冻结控制器在第 80 步的位置出发，在相同的 80 步扰动下比较各控制器；零尾值，独立重复 10 次 | [demos/mpc_model_check.py](../demos/mpc_model_check.py) | 终端输出；读入 [assets/dqn-model-v11/mpc-control.csv](../assets/dqn-model-v11/mpc-control.csv) |
| 第 12 章补充阅读“位置控制中的模型与规划”之“两步动作序列的手算”表格与图；课件 model-v11-control | 变化后每步代价：冻结模型 $.5734$，每步用最近 40 条转移重新拟合 $.1373$，已知真实系数 $.1049$，不施力 $3.4496$；每 10 步分箱的代价曲线 | 本课的模拟：每个控制器从 $x_0=2$ 起执行 160 步，第 80 步偏置改变且状态与模型不重置；向前看 4 步，枚举 81 条开环候选，噪声标准差 $.03$；独立重复 10 次，同一运行内各控制器共用外部扰动 | [demos/dqn_model_v11.py](../demos/dqn_model_v11.py) | [assets/dqn-model-v11/results.json](../assets/dqn-model-v11/results.json)（`model.results`）；[assets/dqn-model-v11/mpc-control.csv](../assets/dqn-model-v11/mpc-control.csv)；[assets/dqn-model-v11/mpc-control.png](../assets/dqn-model-v11/mpc-control.png) |
| 12.3 节“一步模型要保留什么”；课件 continual-onestep-results | 递归一步模型与直接多步模型在 1 至 16 步的条件均值预测误差及 95% 区间，分正确线性类与漏掉截距两种情形 | 本课的模拟：线性动态 $(.9,0,.2)$ 与漏截距情形 $(.8,.2,.1)$，每份数据 32 或 256 条长 16 的轨迹，起点在 $[-1,1]$ 上均匀；两种模型读同一批轨迹；独立生成 300 份训练数据 | [demos/multiscale_models.py](../demos/multiscale_models.py) | [demos/multiscale-results/linear-32.csv](../demos/multiscale-results/linear-32.csv)；[demos/multiscale-results/omitted_intercept-32.csv](../demos/multiscale-results/omitted_intercept-32.csv)；[demos/multiscale-results/summary.json](../demos/multiscale-results/summary.json)；[demos/multiscale-results/manifest.json](../demos/multiscale-results/manifest.json) |
| 12.3 节“模型的四种用法”“两种不确定与误差界”；12.4 节“只为决策服务的模型”；课件 ch12-two-uncertainty、ch12-value-equiv-corridor、ch12-search-improve | 末门集成成员的通过率 $.07$ 至 $.93$；模型甲（通过率 $.9$、末门 $2.497$）与模型乙（$.7^4\times4=.96$）的决策；搜索深度 $d=1,2,4$ 时起点价值传到 $1.638$ 所需轮数 | 本课的计算：均匀先验的 Beta 后验，成员取 7 个等分位；其余由走廊精确求和 | [demos/ch12_open_numbers.py](../demos/ch12_open_numbers.py) | 终端输出 |
| 12.4 节“只为决策服务的模型”中的价值等价表；第 12 章补充阅读“位置控制中的模型与规划”之“两步动作序列的手算”开头 | 两步位置控制：开环计划选 $B$（代价 $.25$），反馈计划选 $A$（代价 $.15$）；均值模型的预测；施力系数改为 $.4$ 后的选择 | 本课的计算：两步位置控制，代价与期望按分数精确计算 | [demos/feedback_planning.py](../demos/feedback_planning.py) | 终端输出 |
| 12.5 节“校正目标如何改变价值与策略”与图“校正标签、价值更新与已采动作概率”；课件 v17-systems-vtrace-update | 标签 $(1.6,2)$；价值 $(.4,.8)\to(.52,.92)$；行动者权重 $(1.2,1.2)$；已选动作概率 $(.25,.75)\to(.2852,.7611)$ | 本课的计算：两状态单批，$\gamma=.9$，$\bar\rho=\bar c=1$，价值步长 $.1$ | [demos/v17_systems.py](../demos/v17_systems.py) | [assets/v17-systems/checks.json](../assets/v17-systems/checks.json)（`vtrace`）；[assets/v17-systems/vtrace-update.csv](../assets/v17-systems/vtrace-update.csv)；[assets/v17-systems/vtrace-update.png](../assets/v17-systems/vtrace-update.png) |
| 12.6 节开头表格；课件 ch12-systems-gates | 三种调度的实际采样、已读、丢弃、留在队列：先进先出 $120,80,0,40$，优先最新 $120,80,40,0$，调低速率 $80,80,0,0$；先进先出读取时平均版本差 $6.66$ | 本课的模拟：走廊实际转移，3 个采样位置，学习器每周期读 2 条，每周期发布一个新策略版本，共 40 周期，随机种子 12；不训练策略 | [demos/ch12_gate_stream.py](../demos/ch12_gate_stream.py) | [assets/ch12-systems/queue.csv](../assets/ch12-systems/queue.csv) |
| 12.6 节“积压、丢弃与限速”与图“FIFO 队列的积压”；选读“序列回放与大模型训练系统”；课件 ch12-systems-gates | 40 秒后积压 $400$ 条、平均年龄 $13$ 秒；循环状态 $1.312$ 与 $.625$，burn-in $n_{\rm b}$ 步后的差 $.687\times.5^{n_{\rm b}}$ | 本课的计算：确定性 FIFO，每秒入队 30 条、消费 20 条，不丢弃；线性递推 $h\leftarrow ah+o$ | [demos/frontier_v8_system.py](../demos/frontier_v8_system.py) | [demos/frontier-v8-results/queue.csv](../demos/frontier-v8-results/queue.csv)；[demos/frontier-v8-results/system.json](../demos/frontier-v8-results/system.json)；[demos/frontier-v8-results/burnin.csv](../demos/frontier-v8-results/burnin.csv) |
| 12.7 节选读“团队信用与训练对手分布” | 反事实基线的均值为 $0$；十人各以一半概率按下时全按的概率 $2^{-10}$；石头剪刀布的最优反应循环与均匀策略对各纯策略的收益 $0$ | 本课的计算：有限精确枚举 | [demos/multiagent_selfplay_check.py](../demos/multiagent_selfplay_check.py) | 终端输出（JSON） |
| 12.7 节“什么叫学好，以及四种多人算法”；课件 ch12-what-good、ch12-penalty、ch12-vdn-qmix、ch12-seq-update；12.8 节“自对弈的循环”（课件 ch12-psro） | 可被利用度；惩罚博弈中对均匀伙伴出 $a$ 平均 $0$、出 $b$ 平均 $.667$；VDN 拟合与贪心联合动作；同时与依次最优反应的团队奖励；PSRO 各轮种群与元纳什解 | 本课的计算：小型矩阵博弈精确计算 | [demos/ch12_open_numbers.py](../demos/ch12_open_numbers.py) | 终端输出 |

运行：

```sh
python3 demos/ch12_fixed_corridor.py
python3 demos/course_v12_visuals.py
python3 demos/ch12_open_numbers.py
python3 demos/offline_support_walkthrough.py
python3 demos/ch12_gate_planning.py
python3 demos/ch12_gate_planning.py --figure gate-horizon.pdf
python3 demos/dqn_model_v11.py
python3 demos/deep_v13_connections.py
python3 demos/mpc_model_check.py
python3 demos/multiscale_models.py
python3 demos/feedback_planning.py
python3 demos/v17_systems.py
python3 demos/ch12_gate_stream.py --csv assets/ch12-systems/queue.csv
python3 demos/frontier_v8_system.py
python3 demos/multiagent_selfplay_check.py
```

外部代码与公开数据（出处）：Dyna 结构图（Silver，RL 课程第 8 讲 PDF 第 26 页，assets/silver/dyna-architecture.png）；IMPALA 行动者–学习者示意（Espeholt 等，2018，图 1，assets/course31-deep/impala-actors.png）；OpenAI Five 数据滞后与复用的加速比曲线（Berner 等，2019，附录 M.2 图 22、M.3 图 24，assets/ch12-systems/five-lag.png、five-reuse.png）及训练图 9（assets/course31-intro/openai-five-fig9.png）；GEAR 服务器数与读取吞吐（Wang、Sit 等，ICML 2023，图 5，assets/ch12-systems/gear-read.png；作者代码 github.com/bigrl-team/gear）；HybridFlow 的作者实现 verl（github.com/volcengine/verl）。

## 第 13 章　大语言环境下的强化学习 {#ch-13}

本章的数字来自两处程序。demos/ 下的程序给出讲义 13.12 节（评测与检验）查询与读数利用的精确枚举，以及课件 13.3、13.8、13.9、13.10 节的四组算例：可验证奖励下 pass@k 的边界、多智能体的通信与辩论、自我改进的分布递推、离散化的决策损失。这四组都是精确计算或小规模模拟，不含模型训练。

长序列信用分配、多轮估计、组内采样与反馈目标的推导核对，以及来源反转、探测时机和探测状态的流式部署模拟，来自配套阅读稿的程序。这些程序与结果文件放在 `web/chapter-13/reading/reader-source/`（相对于课程根目录 01-完整版课程，不在 rl-course 内），表中只写路径，不加链接；运行命令里的 cd 一行进入该目录。

语言环境定义图与记忆更新图取自作者原文，Search-R1 轨迹、ProRL 曲线与 SWE-bench 的 Flask 轨迹取自公开材料，均不在表中。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 课件 a-03-token-message、d1-message-score、d1-private-credit、ch13-operation-credit | 逐词元与整条消息两种分组下策略梯度的恒等式（页内例 $.4s(z_1)+.6s(z_2)$）；长度 1–12 的两个长序列例全部通过；可变长度交互树上 27 组参数三元组的梯度与有限差分的最大误差 | 本课的计算：精确枚举，无采样；交互树参数取 $\{-.8,0,.6\}^3$ | `web/chapter-13/reading/reader-source/check_autoregressive_credit.py` | 终端输出 |
| 课件 b-message-q、d2-assigned-value、d2-sample-targets、d2-prefix-is | 各组大小下原梯度、自含基线与留一基线的梯度；旧参数处整句裁剪与逐词裁剪代理的梯度（正优势上侧裁剪 $1.2$）；费用留在被跳过的观测位与归给产生费用的行动两种记账 | 本课的计算：多轮轨迹的精确枚举与记账核对，不读模型或训练日志 | `web/chapter-13/reading/reader-source/check_multiturn_estimators.py` | 终端输出 |
| 课件 b-group、d1-update-granularity | 组大小 $K$ 下、成功率 $p=.05,.50,.95$ 时组内标准化相对原成功率梯度的倍率；八条运行覆盖深处两个分支的概率 | 本课的计算：对组内通过数按二项分布取期望；执行预算算例中完成后的通过率 $(.40,.80)$ | `web/chapter-13/reading/reader-source/check_group_sampling.py` | 终端输出 |
| 课件 algo-branch-prefix、ch13-branch-allocation、b-budget | 异向任务：选中两处的局部优势 RMSE，同题 GRPO $.153$，分支法 $.077$；整策略增益由 $1.77$ 变为 $1.55$ 个百分点。同向任务对应为 $.163$、$.076$ 与 $1.17$、$.98$ | 本课的模拟：受控生成树，每条回答 48 次二元选词，候选位置 24 类中选 2 处；每法 27,648 个生成词元、576 次核验（先导 192、更新 384），组大小 8，一步更新的轨迹 KL 为 $.01$；独立重复 192 次，按种子配对 | `web/chapter-13/reading/reader-source/credit_budget_comparison.py` | `web/chapter-13/reading/reader-source/credit-budget-results.json`（`scenarios.shifted`、`scenarios.aligned`） |
| 课件 d1-chance-tilt、d1-feedback-equivalence、d1-comparison-graph | 单轮情形的共同最优 $P(\text{first})$；DPO 的前缀项抵消到第 5 个词元；8 条多轮路径；部署差距 $V-J$；环境分支 $.5$ 与倾斜后的样本概率 $\sigma(1)$ | 本课的计算：可精确枚举的教学模型 | `web/chapter-13/reading/reader-source/check_feedback_objectives.py` | 终端输出 |
| 课件 c-heldout-sources | 留出环境 B 中已学策略与等频随机策略的平均净回报 $1.474$ 与 $1.255$（高 $.219$），可靠性反转后 $1.149$ 与 $1.223$（低 $.074$）；反转时固定写入、只打乱来源，精确期望由 $1.143$ 升至 $1.270$ | 本课的模拟：策略只在来源环境训练一次后固定，等频随机策略打乱可见条件与操作的对应、保持平均频率；每策略每环境独立运行 16,000 次（函数 `evaluate`）；反转环境另做精确期望 | `web/chapter-13/reading/reader-source/decision_returns.py` | 终端输出 |
| 课件 c-source-revaluation、lang-memory-deployment-curves、d5-delayed-source-algorithm | 来源反转后按核验回执修订记忆与只做抽查的累计净回报曲线；修订减抽查的配对差 $118.12$，约 95% 区间 $[108.51,127.73]$；算法 13.12 | 本课的模拟：每条部署流 2,400 组委托，第 801 组起来源可靠性反转；抽查率 $.32$，核验标签延迟 3 组，抽查费用 $.02$，修订费用 $.25$；每 40 组绘一个均值；每种工况独立重复 96 次 | `web/chapter-13/reading/reader-source/stream_revaluation.py`；曲线页另有 `draw_stream_revaluation.py` | `web/chapter-13/reading/reader-source/stream-revaluation-results.json`（`scenarios.reversal.paired_contrasts.revise_minus_probe`） |
| 课件 c-lifetime-evidence | 等额探测下学得时机策略减固定策略的全程净回报差 $-3.38$，约 95% 区间 $[-17.67,10.91]$ | 本课的模拟：每流 2,400 组委托，第 801 组反转，每窗 12 组、两份核验，每流恰好 400 份；源策略只在独立来源环境训练；探测策略每流重新初始化，迹衰减 $.8$，步长 $.02$，种子 81200 起；独立重复 96 对 | `web/chapter-13/reading/reader-source/probe_policy_learning.py` | `web/chapter-13/reading/reader-source/probe-policy-results.json`（`scenarios.reversal.difference`） |
| 课件 d3-event-timescales、d5-event-state-algorithm、d3-factorial-control、d3-return-state、d3-return-trace | 第一批短迹学得表示：四窗均方误差由恒零预测的 $4.539$ 降至 $4.470$，两支改为均值预测后再降 $.0063$；学得减屏蔽的每流净回报差 $-.67\,[-1.98,.64]$ 等四个区间；长迹减短迹 $-9.81\,[-20.45,.83]$、$-8.63\,[-24.86,7.60]$（等参数步）与 $-.07\,[-15.24,15.09]$、$-17.72\,[-34.66,-.78]$（等概率位移）；算法 13.14 | 本课的模拟：来源反转的流式语言接口，每条部署 200 窗、每窗两份核验，共 400 份；屏蔽、冻结、学得三种历史表示 × 迹衰减 $.80$ 与 $.97$ 六组；事件频次以 $.90$、$.99$ 衰减，预测头步长 $.02$；等参数步把非零参数步归一为 $.04$，等概率位移由 24 条校准流选定长迹步长 $.062$；两批各 96 条独立流，种子 112000 与 124000，校准种子 136000 | `web/chapter-13/reading/reader-source/probe_event_state.py`；图页另有 `draw_learned_event_state.py` | 同目录 `probe-state-results.json`、`probe-state-validation.json`、`probe-state-calibration.json`、`probe-state-functional-results.json`、`probe-state-functional-validation.json`（`worlds.reversal.summary`、`worlds.reversal.contrasts`） |
| 13.12 节“探索与利用读数” | 查询概率 $\sigma(a)$ 与跟随读数概率 $\sigma(b)$ 下的期望成功率 $J$ 及 $\partial J/\partial a$、$\partial J/\partial b$；五组 $(a,b,q,c_{\rm obs})$：$(0,0,.9,.1)$、$(0,2,.9,.1)$、$(-6,0,.9,.1)$、$(0,2,.5,.1)$、$(0,2,1,0)$ | 本课的计算：两把钥匙、一个有噪声传感器，枚举全部轨迹；闭式期望与有限差分核对，无采样 | [demos/language_query_policy.py](../demos/language_query_policy.py) | 终端输出 |
| 13.3 节（课件 `r9-rlvr-boundary`） | 两题例：训练前通过率 .5 与 .02，训练后 .9 与 0；pass@1 由 .26 到 .45，pass@64 由 .86 到 .50；两条曲线在 $k\approx3.8$ 处相交 | 本课的计算：两道题的通过率按二项式精确计算，无训练；数值与 demos/ch13_r21_r4_numbers.py 的打印一致 | [demos/ch13_r21_r4_figs.py](../demos/ch13_r21_r4_figs.py)；[demos/ch13_r21_r4_numbers.py](../demos/ch13_r21_r4_numbers.py) | [assets/ch13-r21/passk-curves.pdf](../assets/ch13-r21/passk-curves.pdf)、[assets/ch13-r21/entropy-knobs.pdf](../assets/ch13-r21/entropy-knobs.pdf) |
| 13.8 节（课件 `ch13-r21-plan-dp`、`ch13-r21-topology`、`ch13-r21-debate`） | 辩论：单个判断正确率 $q=.6$ 时，3 轮后判断正确的概率约 .648，9 轮 .733，12 轮 .754，另画 40 条模拟信念路径；拓扑：调和数 $H_N$ 为 1、1.5、2.28（$N=5$）、2.93（$N=10$）；规划：词元总数 16 对 12，约 1.33 倍 | 本课的计算与模拟：精确递推给出辩论曲线，信念路径为随机模拟 | [demos/ch13_r21_mas.py](../demos/ch13_r21_mas.py) | [assets/ch13-r21-mas/comm-plane.pdf](../assets/ch13-r21-mas/comm-plane.pdf)、[assets/ch13-r21-mas/debate-belief.pdf](../assets/ch13-r21-mas/debate-belief.pdf) |
| 13.9 节（课件 `ch13-r21-si-example`） | $\pi_0=(.6,.3,.1)$ 下四条曲线：金线 .706、.774、.814、.835、.846，趋于 .857；红线由 .80 起，第 10 代 .68、第 20 代 .42、第 30 代 .20；绿线一代后 .938，趋于 1；蓝线 .792（真实数据占 20%，阈值 .1） | 本课的计算：理论曲线按递推精确计算，与 3000 次模拟的平均一致 | [demos/ch13_r21_si_ledger.py](../demos/ch13_r21_si_ledger.py) | [assets/ch13-r21-si/si-example.pdf](../assets/ch13-r21-si/si-example.pdf) |
| 13.10 节（课件 `ch13-r21-discrete-loss`） | 离散化合并需要不同动作的状态时的决策价值损失；图块网格把定位量化到块中心时点中小目标的概率（附蒙特卡洛核对）；Chameleon 码率：每个码 13 比特对应 $16\times16$ 像素，原始像素为 6144 比特 | 本课的计算，无训练 | [demos/ch13_r21_discrete_toy.py](../demos/ch13_r21_discrete_toy.py) | 只在终端输出，不写文件 |
| 课件 `ch13-error-accum`、`ch13-sample-coverage`、`ch13-path-credit`、`ch13-replicator`、`ch13-optimizer-step`、`ch13-bench-estimator` | 全对概率 $(1-\varepsilon)^T$（$\varepsilon=10^{-3}$、$T=2000$ 时约 $.135$）；$N$ 次采样至少见一次的概率 $1-(1-u_0)^N$；整条路径与逐步信号；复制子动力学从 5% 到 95% 约 $83/\eta$ 步，符号式更新约 $2.9/\eta$ 步；优化器耦合；逐词元漂移 $10^{-4}$ 经 8000 词元得比率 $e^{0.8}\approx2.23$；准确率 50% 时 95% 区间半宽 $17.9$、$9.8$、$4.4$、$2.2$ 个百分点（$n=30,100,500,2000$） | 本课的计算：页内设定下的闭式计算 | [demos/ch13_open_numbers.py](../demos/ch13_open_numbers.py) | 只在终端输出，不写文件 |
| 课件 `ch13-sys-two-dists` | 每词元对数概率差标准差 $\sigma$、长度 $L$ 时，序列比率在 $+1$ 个标准差处为 $e^{\sigma L^{1/2}}$；画出 $e^{\sigma L^{1/2}}=1.1,1.5,2$ 三条等值线，并标出页内六个设定 | 本课的计算：$L$ 个独立词元的对数比率相加 | [demos/ch13_two_dists_contour.py](../demos/ch13_two_dists_contour.py) | [assets/ch13-r21/two-dists-contour.pdf](../assets/ch13-r21/two-dists-contour.pdf) |

运行：

```sh
python3 demos/language_query_policy.py
python3 demos/ch13_r21_r4_figs.py        # 写 assets/ch13-r21
python3 demos/ch13_r21_r4_numbers.py     # 只打印
python3 demos/ch13_r21_mas.py            # 写 assets/ch13-r21-mas
python3 demos/ch13_r21_si_ledger.py      # 写 assets/ch13-r21-si
python3 demos/ch13_r21_discrete_toy.py   # 只打印
python3 demos/ch13_open_numbers.py        # 只打印
python3 demos/ch13_two_dists_contour.py   # 写 assets/ch13-r21
cd ../web/chapter-13/reading/reader-source
python3 check_autoregressive_credit.py
python3 check_multiturn_estimators.py
python3 check_group_sampling.py
python3 credit_budget_comparison.py
python3 check_feedback_objectives.py
python3 decision_returns.py
python3 stream_revaluation.py --json stream-revaluation-results.json
python3 probe_policy_learning.py --budget exact --json probe-policy-results.json
python3 probe_event_state.py --seed 112000 --json probe-state-results.json
python3 probe_event_state.py --seed 124000 --json probe-state-validation.json
python3 probe_event_state.py --calibrate --seed 136000 --repetitions 24 --json probe-state-calibration.json
python3 probe_event_state.py --seed 112000 --use-calibration probe-state-calibration.json --json probe-state-functional-results.json
python3 probe_event_state.py --seed 124000 --use-calibration probe-state-calibration.json --json probe-state-functional-validation.json
```

外部代码与公开数据（出处）：语言环境定义图与记忆更新图（温颖原文图一、图六，assets/ch13-language/lle-definition.png、memory-update.png）；Search-R1 作者公布的单次检索轨迹（assets/ch13-language/search-r1-execution.png，许可见同目录 Search-R1-LICENSE.txt）；ProRL 原图 4 的三个任务（assets/frontier-v13/crops/prorl-fig4-selected.png）；SWE-bench bash-only 排行榜公开的 Claude Opus 4.6 轨迹与评测报告，任务 pallets__flask-5014（swe-bench-submissions.s3.amazonaws.com）。

## 第 14 章　物理环境下的强化学习 {#ch-14}

本章来自本课程序的结果有：14.1 节的时延与镇定边界；14.3 节公开真机记录 R1Lite 的接管片段及其逐帧时钟；14.4 节模仿误差的三条误差带；14.5 节生成路径梯度的数值核对；14.6 节想象回报误差与模型评判几页的复算；14.8 节两页部署实验（同样工时下的诊断方式、lifetime 内的技能发现）。

人工接管加权中的 $.78\to.60$、语言智能体重试一例（$.57\to.83$、$1.135$）、吞吐表（$162$、$192$、$124.6$、$106.7$、$13.8$、$26.7$）、系统 3 的定价例、探测价值 $.11$、数据飞轮一例（$.664$、$.738$）与自测题中的数，由正文推导直接算出。UniVTAC、HIL-SERL、Veo、RLT、QT-Opt、Helix 等系统的数字引自文献，不列入表中。

接口图 `interface.svg` 与信用分配图 `credit.svg` 由 `textbook/embodied/src/draw.py` 绘制；物理时间与重置、问题设定核、视觉语言动作命令接口三张示意图只有图文件。这些图都不含计算结果。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 14.1 节“第二种划分：按时间尺度分层”；课件 emb-layers-latency | $\omega=\sqrt{g/z}=3.30\,\mathrm{s^{-1}}$；时延 1 毫秒、20 毫秒、100 毫秒、1 秒时偏差放大 $1.003$、$1.07$、$1.39$、$27.2$ 倍；带时延比例反馈下，$\omega\ell=.3$ 时 $K$ 可取 1 到 4.6，$\omega\ell=.9$ 时只剩 1 到 1.14，$\omega\ell\ge1$ 时无增益可镇定；接触力超调 20 毫秒为 20 牛、1 秒为 1,000 牛 | 本课的计算：线性倒立摆发散分量，质心高 $.90$ 米，$g=9.81$；反馈 $p(t)=K\,\xi(t-\ell)$，初值与历史均取 $\xi=1$，欧拉积分步长 $10^{-4}$ 秒、共 20 秒，末 $20\%$ 时段 $\lvert\xi\rvert$ 峰值小于 $.5$ 判为镇定；$K$ 取 $1.02$ 到 $4.98$、间隔 $.02$；$\omega\ell$ 取 $.3$、$.6$、$.9$、$1.1$、$1.5$；接触刚度 $10^4$ 牛每米、接近速度 $.1$ 米每秒；确定性计算，无随机重复 | [embodied/src/layer_latency.py](embodied/src/layer_latency.py) | 不写文件，结果打印在终端 |
| 14.3 节“部分验收与人工接管”（图 `mixed-trace.svg`） | R1Lite 第 0 段共 473 帧、每秒 15 帧；第 0–368 帧由策略控制，第 369–404 帧人工接管，第 405–472 帧交还策略；头部相机第 355、397、423 帧；第 14 个关节分量的命令与读数曲线 | 公开真机记录的逐帧摘录：BodenAI RW-RL-HIL-Dataset，修订 `9290f5a96dc91ea58256e81d9ce2dd9621890b51`，第 0 段；摘录时核对源文件的 SHA-256；`action.qpos` 与 `observations.state.qpos` 取第 14 个分量；无模拟，无随机重复 | [embodied/src/extract_mixed_trace.py](embodied/src/extract_mixed_trace.py)（摘录与选帧，需 duckdb、ffmpeg、ffprobe）；[embodied/src/draw_mixed_trace.py](embodied/src/draw_mixed_trace.py)（作图） | 摘录 [embodied/data/mixed-trace.csv](embodied/data/mixed-trace.csv)，来源与字段说明 [embodied/data/mixed-trace-source.json](embodied/data/mixed-trace-source.json)，选帧 [embodied/data/mixed-trace-frame-355.jpg](embodied/data/mixed-trace-frame-355.jpg)、[-397](embodied/data/mixed-trace-frame-397.jpg)、[-423](embodied/data/mixed-trace-frame-423.jpg)；图 [embodied/figures/mixed-trace.svg](embodied/figures/mixed-trace.svg) |
| 第 14 章补充阅读“真机记录中的时延”“事件预测的更新”（课件 emb-record-clock、emb-response-target）；14.8 节“混合轨迹”（课件 emb-mixed-trajectory） | 第 391 帧命令由 $100$ 降为 $0$，读数由第 390 帧的 $96.72$ 降到第 397 帧的 $6.16$，两帧相隔 $.400$ 秒；采集时钟上第 390、391、397 帧分别为 $26.00$、$26.07$、$26.47$ 秒；第 404 帧之后的一段间隔约 $2.27$ 秒；第 390、397、423 帧右腕画面 | 本课的计算：同一段 R1Lite 公开记录，读取采集时钟与第 14 个关节分量，逐帧对照命令与读数，并以接管前 368 对等间隔的自主相邻帧用最小二乘拟合一步响应预测，再分人工接管（35 对）与交还后（67 对）两段，与沿用上一帧读数的预测比较平均绝对误差；确定性计算，无随机重复 | [embodied/src/r1lite_response.py](embodied/src/r1lite_response.py) | 输入 [embodied/data/r1lite-acquisition-clock.csv](embodied/data/r1lite-acquisition-clock.csv)、[embodied/data/mixed-trace.csv](embodied/data/mixed-trace.csv)、[embodied/data/r1lite-visible-outcome.json](embodied/data/r1lite-visible-outcome.json)、右腕画面 [embodied/data/r1lite-right-wrist-390.jpg](embodied/data/r1lite-right-wrist-390.jpg)、[-397](embodied/data/r1lite-right-wrist-397.jpg)、[-423](embodied/data/r1lite-right-wrist-423.jpg)；输出 [embodied/data/r1lite-response-results.json](embodied/data/r1lite-response-results.json)、[embodied/figures/r1lite-acquisition-response.svg](embodied/figures/r1lite-acquisition-response.svg) |
| 14.5 节“视觉语言动作模型的微调路线”（链接“生成路径梯度的数值核对”） | 隐变量路径得分 $.8$ 与边缘得分 $1.2$ 不同；按路径求积的梯度约为 $1.0$，与有限差分梯度一致 | 本课的计算：$z_1\sim\mathcal N(\theta,.25)$，$a\sim\mathcal N(z_1,.25)$，奖励 $-(a-.5)^2$，$\theta=0$；数值求积与有限差分对照；程序另含三项有限核对；确定性计算，无随机重复 | [demos/llm_embodied_v11.py](../demos/llm_embodied_v11.py) | [assets/llm-embodied-v11/checks.json](../assets/llm-embodied-v11/checks.json)、[assets/llm-embodied-v11/group-expectations.csv](../assets/llm-embodied-v11/group-expectations.csv)；加 `--figures` 时另写 [assets/llm-embodied-v11/group-gradients.png](../assets/llm-embodied-v11/group-gradients.png) |
| 课件 emb-intervention-yield（14.8 节） | 频繁漂移情形下，自适应诊断减固定周期校准为 $10.51\ [9.78,\,11.24]$；减只靠反馈、无专门探测为 $.57\ [-.16,\,1.29]$ | 本课的模拟：合成工位，每班 160 个时刻，前瞻 14 步；固定周期在 $(8,16,32,64,\text{不校准})$ 中按 64 个拟合种子（0–63）选定，频繁情形选中 16；在 512 个留出的配对班次（种子 10000–10511）上评价，即独立重复 512 次；频繁情形每时刻磨损与漂移的发生率为 $.018$ 与 $.025$；区间为配对差值的 $1.96$ 倍标准误 | [embodied/src/physical_diagnosis20.py](embodied/src/physical_diagnosis20.py) | [embodied/data/physical-diagnosis20.json](embodied/data/physical-diagnosis20.json)（`frequent` 一项）；[embodied/figures/physical-diagnosis20.svg](embodied/figures/physical-diagnosis20.svg) |
| 课件 emb-lifetime（14.8 节） | 第 3600 步的净收益：自行发现技能 $659.5$，原始动作 Q 学习 $412.8$，固定两种事件 $226.1$；前 600 步 $11.8$ 对 $16.0$ | 本课的模拟：不重置的合成工位，lifetime 3600 个时刻；第 600 步提名候选、第 1200 步结束练习，第 1500 步起出现新的复合订单；每条命令代价 $.025$，失败代价 $.15$，恢复占 2 个时刻；规划折扣 $.96$；8 种方法在 72 个配对种子（5100–5171）上各独立重复 72 次；区间为 Student-$t$ $95\%$ 区间 | [embodied/src/physical_discovery11.py](embodied/src/physical_discovery11.py)（作图调用同目录的 `draw_physical_world.py`） | [embodied/data/physical_discovery11.json](embodied/data/physical_discovery11.json)、[embodied/data/physical_discovery11_pairs.csv](embodied/data/physical_discovery11_pairs.csv)；[embodied/figures/physical-discovery11.svg](embodied/figures/physical-discovery11.svg) |
| 14.4 节（课件 `ch14-sys-stable-imitation`） | 三条误差带：$c=L>1$ 指数放大，$c=1$ 线性增长，$\rho<1$ 有界于 $\varepsilon/(1-\rho)$；$H=100$ 时 $\varepsilon H(H-1)/2=4950\varepsilon$ | 本课的计算：偏差按 $d_{t+1}=c\,d_t+\varepsilon$ 递推，无训练 | [demos/ch14_s4_error_bands.py](../demos/ch14_s4_error_bands.py) | [assets/ch14-r21/error-bands.pdf](../assets/ch14-r21/error-bands.pdf) |
| 14.6 节（课件 `emb-imagination`、`ch14-model-judge`） | 吸收态例子的回报误差与误差界：20 步 1.973 对 2.10，30 步 4.230 对 4.65；$N$ 个标准正态最大值的期望 $m_N$：.56（$N=2$）、1.54（10）、2.51（100）、3.24（1000）；同程序另打印 `ch14-imagine-practice`、`ch14-sys-wam-rank`、`emb-domain-randomization`、`emb-occupancy` 各页的数 | 本课的计算，数值积分，无训练 | [demos/ch14_s5_r21_numbers.py](../demos/ch14_s5_r21_numbers.py) | 只在终端输出，不写文件 |

外部代码（出处）：HIL-SERL 的 `train_rlpd.py`（rail-berkeley/hil-serl，提交 `c32939b`）。公开数据：BodenAI 等发布的 RW-RL-HIL-Dataset（CC BY 4.0），R1Lite 两行所用记录均取自该数据集的上述修订。

运行：
```sh
python3 textbook/embodied/src/layer_latency.py         # 只打印
python3 textbook/embodied/src/extract_mixed_trace.py   # 从 Hugging Face 下载指定修订的源文件；需 duckdb、ffmpeg、ffprobe
python3 textbook/embodied/src/draw_mixed_trace.py
python3 textbook/embodied/src/r1lite_response.py       # 可加 --capture-from、--wrist-video 重新摘录
python3 demos/llm_embodied_v11.py --figures            # 写 assets/llm-embodied-v11
python3 demos/ch14_s4_error_bands.py                   # 写 assets/ch14-r21/error-bands.pdf
python3 demos/ch14_s5_r21_numbers.py                   # 只打印
python3 textbook/embodied/src/physical_diagnosis20.py
python3 textbook/embodied/src/physical_discovery11.py
```

## 第 15 章　学习器与全程回报 {#ch-15}

本章来自本课程序的结果有三组。第一组是 15.3 节的两张图：三站实验中持续更新与冻结学习的对照，以及两臂设定下先试探与始终选已知动作的期望累计奖励。第二组是课件中仓库例的逐步核对，包括甲、乙两个学习器的询问时机、全程回报 $J$ 的逐步计算与记号小例，由两个只在终端输出的程序做精确枚举与有限算术。第三组是第 15 章补充阅读“四区仓库实验”中四区仓库上的阶梯实验，比较识别情境与常数步长两种学习器的 lifetime 奖励率。此外有两个文献原型：15.1 节按 Sutton、Koop 与 Silver（2007）重跑的黑白世界，以及 15.3 节仿照 Abel 等（2023）的切换 MDP。

讲义中 15.1 节仓库例甲、乙 16 步的逐步累计奖励（终值 20 与 13）及冻结测试的得分、配送车算例、15.3 节“两种探测时机的数值计算”中成功率 $.3/.7$ 一例的 $.58$、10 步门槛及信息价值 $.09558$（$h=9$）与 $.11409$（$h=10$），以及全程回报分解中的数，由正文推导直接算出。章内其余图为示意图，或取自 Sutton 与 Barto 等文献。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 15.3 节“持续学习的一种定义”中的延伸“冻结后的测试起点、三站任务的轨迹与含噪探测”（图 `lifetime-versus-policy.png`） | 持续更新组全程平均率 $.208758$、末次策略率 $.149052$；第 60,000 步后冻结组分别为 $.167127$ 与 $.065767$；从初始化起的累计收益曲线 | 本课的模拟：第 24 章三站持续导航任务（八格 Y 形网格，三站奖励 $1$、$.2$、$3$，第 60,000 步起 C 站降为 $.1$，滑移概率 $.1$），每次运行 120,000 个原始步，不重置；继续更新与冻结学习两组，各独立重复 8 次（种子 0–7）；末次策略率由已知环境对含探索的冻结策略求稳态率，只用于评价；阴影为 8 次均值的标准误。本章的程序只重新分析保存的原始转移，不重新训练 | [demos/v19_continual.py](../demos/v19_continual.py)；原始记录由 [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) 产生 | 输入 [assets/crl-joint-v12/learning-curves.csv](../assets/crl-joint-v12/learning-curves.csv) 与同目录 `raw-no_planning-seed0.npz` 至 `raw-frozen-seed7.npz`；输出 [assets/v19-continual/lifetime-evaluation.csv](../assets/v19-continual/lifetime-evaluation.csv)（`t=120000` 两行）、[assets/v19-continual/lifetime-versus-policy.png](../assets/v19-continual/lifetime-versus-policy.png)、[assets/v19-continual/checks.json](../assets/v19-continual/checks.json) |
| 15.3 节“两种探测时机的数值计算”（图 15.1 `lifetime-information.png`） | 总预算 $T=1$ 时始终选 $a$ 较高（$.6$ 对 $.5$），$T\ge2$ 起先试 $b$ 反超（$T=2$ 时 $1.3$ 对 $1.2$） | 本课的计算：已知动作 $a$ 每步得 $.6$；$b$ 的奖励 $\Theta\in\{0,1\}$ 固定、先验各半，试一次即知；$T=1$ 到 $20$，闭式 $.6T$ 与 $.5+.8(T-1)$ 与信念动态规划对照；确定性计算，无随机重复 | [demos/crl_v10_derivations.py](../demos/crl_v10_derivations.py) | [assets/crl-v10/results.json](../assets/crl-v10/results.json)（`lifetime` 一项）；[assets/crl-v10/lifetime-information.png](../assets/crl-v10/lifetime-information.png) |
| 15.1 节“实验：黑白世界中的跟踪与冻结”（页 `ch15-lit-blackwhite`、`ch15-lit-blackwhite-frozen`） | 固定 $\alpha=4$ 时 look 步平均交叉熵 $.2477$，收敛解 $\ln 2=.6931$；最优固定步长 $4.5$（$.2469$）；IDBD 最后 1 万步的步长 $4.47$–$4.60$（初始步长 $.1$ 一组为 $4.24$ 且仍在上升）；后半段任取一刻冻结 $\alpha=4$ 的权重，长期损失 $2.08$；单状态反例中最优固定 $.7428$、最优 IDBD $.7430$；60 步样本轨迹 | 本课重跑 Sutton、Koop 与 Silver（ICML 2007）的 Black and White 世界：20 格成环，左 10 格为黑，look/left/right 概率 $.5/.25/.25$，单权重 logistic 预测、交叉熵，$w_0=0$；固定步长 25 个取值，各 30 次独立运行 × 200,000 步，统计后 100,000 步的 look 步；IDBD $\mu=2^{-13}$，9 个初始步长各 3 次 × 1,000,000 步；单状态反例 $w_0=-5$、$\mu=2^{-10}$、30 次 × 1000 步；随机种子 2007 | [demos/ch15_lit_blackwhite.py](../demos/ch15_lit_blackwhite.py) | [assets/ch15-lit-blackwhite/results.json](../assets/ch15-lit-blackwhite/results.json) |
| 15.3 节“实验：切换的 MDP”（页 `ch15-lit-switching`） | 全程平均奖励：常数步长 $.1574$，退火 $.0996$，配对差 $.0578$（250 次全部为正）；看得到下标的参照 $.2339$；知道下标且不探索的最短路奖励率 $.311$；每 1 万步窗口平均曲线 | 本课仿照 Abel 等（NeurIPS 2023）Fig. 2(b) 的 switching MDP（原环境取自 Luketina 等；原文给出 10 个 MDP、每步以 .001 的概率切换、平均奖励、$\varepsilon=.15$、常数 $\alpha=.1$ 对退火、250 次运行，未给出网格大小与奖励布置，这些由本课自定）：5×5 网格，10 个 MDP 各一个目标格，走进得 1 后落到随机非目标格，不复位；每步以 $.001$ 的概率切换，智能体看不到下标；$\gamma=.9$、$\varepsilon=.15$ 的 Q 学习，常数 $\alpha=.1$ 对 $\alpha_t=.1/(1+t/10^4)$；250 次独立运行 × 300,000 步；随机种子 2023 | [demos/ch15_lit_switching.py](../demos/ch15_lit_switching.py) | [assets/ch15-lit-switching/results.json](../assets/ch15-lit-switching/results.json) |
| 15.1 节（课件 `ch15-r21-bandit`）；15.2 节（课件 `ch15-forward-numeric`）；第 15 章开头“哪些结论要改写”（课件 `ch15-old-results`） | 仓库例：甲第 1 趟在转角询问、乙第 3 趟询问，两者的逐趟累计奖励；全程回报 $J$ 由 0 到 2 再到 $5/2$ 的逐步计算；两臂赌博机上样本均值学习器与固定策略的对照 | 本课的计算：精确枚举与有限算术，无训练 | [demos/ch15_r21_check.py](../demos/ch15_r21_check.py) | 只在终端输出，不写文件 |
| 15.3 节（课件 `ch15-r21-notation-map`、`ch15-r21-notation-example`） | 记号对照页与小例页的数：$T=16$，$r_*=4/3$，固定策略“总向左”、知道世界时的最优策略“随灯”与甲、乙的台阶 | 本课的计算：每趟指示独立、左右各半，精确枚举 | [demos/ch15_r21_notation_check.py](../demos/ch15_r21_notation_check.py) | 只在终端输出，不写文件 |
| 第 15 章补充阅读“规律切换”（课件 `ch15-ladder`） | 识别情境（RL-CD 的简化）学成后达到天花板的 86%，常数步长 71%；两者 lifetime 率差 $+.0013\pm.0015$，不显著 | 本课的模拟：四区仓库（demos/crl_ladder_world.py），200 万步，60 个种子，各学习器同种子配对 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch15` | [assets/crl-ladder-world/runs/formal-ch15.json](../assets/crl-ladder-world/runs/formal-ch15.json)、[assets/crl-ladder-world/fig/ladder-ch15.png](../assets/crl-ladder-world/fig/ladder-ch15.png) |

运行：
```sh
python3 demos/crl_joint_v12.py         # 重新产生三站实验原始记录；默认写 assets/crl-joint-v12，可用 --output-dir 另写
python3 demos/v19_continual.py         # 读 assets/crl-joint-v12，写 assets/v19-continual
python3 demos/crl_v10_derivations.py   # 写 assets/crl-v10
python3 demos/ch15_lit_blackwhite.py              # 文献原型：黑白世界，写 assets/ch15-lit-blackwhite
python3 demos/ch15_lit_switching.py 250 300000    # 文献原型：切换的 MDP，写 assets/ch15-lit-switching
python3 demos/ch15_r21_check.py                   # 只打印
python3 demos/ch15_r21_notation_check.py          # 只打印
python3 demos/crl_ladder_learners.py --exp ch15 --seeds 60 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch15.json
python3 demos/crl_ladder_figures.py ch15           # 写 assets/crl-ladder-world/fig/ladder-ch15.png
```

## 第 16 章　平均奖励与差分价值 {#ch-16}

本章来自本课程序的结果有：三站路线的四张图与差分 TD 运行，门口任务的两个奖励率，16.5 节的奖励中心化曲线与逐点数值，16.7 节两状态配送链上的一次行动者–评论者更新，接入控制与 Two Loop 两个文献原型，课件中仓库链的奖励率、折扣值与差分价值的图和数，以及 16.5 节四区仓库上折扣与平均奖励学习器的阶梯实验。仓库链的数在七状态模型上精确求解，不含随机性。

仓库轨迹的奖励率与差分价值（含差分价值图）、三站配送等概率选路的 $13/45$ 与 $4/15$、16.4 节仓库上相对价值迭代的区间 $[2685/2048,\,683/512]$、16.5 节仓库上 $\gamma=.9$ 与 $.99$ 的 $-.583$、$-.621$ 与常数 $23/64$、差分 Q 一节的上限 $1.238$ 与最优总奖励 $13\,333$、16.6 节的翻转阈值与 $\sigma\sqrt{\beta/(2-\beta)}$ 一列、$\alpha\to0$ 时的 $\pm2\varepsilon/7$ 精确解，由正文推导直接算出。控制关系图 `control.svg` 为示意图，不含计算结果。16.5 节“差分 Q 学习与折扣 Q 学习的一次比较”与 16.6 节的几处模拟，程序暂未收入本附录。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 16.1 节“单链任务的奖励率与状态访问频率”与“原始时间与路线奖励率”；16.2 节“三站路线的差分值与周期残差”；16.5 节“三站往返上的差分 TD 运行” | 两条往返路线的到站与奖励时间线；A–C 与 A–B 往返的长期斜率 $1/3$ 与 $.2$，三个起始相位的累计奖励；十二个相位上的差分价值（抵达 C 前一格 $5/3$，刚到 C 为 $-1$）与周期残差；差分 TD 前几步的 $.3$、$.03$、$-.003$、$.0297$，率估计趋近 $1/3$，完整 18,000 次更新后率误差小于 $10^{-7}$、规范化价值误差小于 $10^{-6}$ | 本课的计算：八格三站路网，每条边占一个原始步；A–C–A 往返十二步，到 C 得 $3$、回 A 得 $1$；A–B–A 往返六步，到 B 得 $.2$、回 A 得 $1$；差分价值由 Poisson 方程取 $\tilde v_\pi(A)=0$ 求解，并对每个相位、0 到 60 步的有限和逐一核对；差分 TD 在固定 A–C 往返上沿一条轨迹更新 18,000 次，价值步长 $.1$、率步长 $.01$，全零初值；确定性计算，无随机重复 | [demos/sample14_average_option.py](../demos/sample14_average_option.py) | [assets/sample14-avg-option/sample14-avg-timeline.png](../assets/sample14-avg-option/sample14-avg-timeline.png)、[sample14-avg-slopes.png](../assets/sample14-avg-option/sample14-avg-slopes.png)、[sample14-avg-bias-period.png](../assets/sample14-avg-option/sample14-avg-bias-period.png)、[sample14-avg-td-learning.png](../assets/sample14-avg-option/sample14-avg-td-learning.png)；逐步记录 [assets/sample14-avg-option/sample14-avg-td-updates.csv](../assets/sample14-avg-option/sample14-avg-td-updates.csv)；设置与汇总 [assets/sample14-avg-option/sample14-manifest.json](../assets/sample14-avg-option/sample14-manifest.json) |
| 16.1 节“原始时间与路线奖励率” | 宽门直行、窄门绕行的长期率 $.15$；一律直行 $-.10$ | 本课的计算：每个门口宽窄独立等可能，线索准确；直行时宽门、窄门的报警概率为 $1/10$、$1/2$，奖励 $1-4\times$报警，期望分别为 $.60$、$-1$；绕行得 $0$；每趟两个原始步；有理数精确计算，无随机重复 | [demos/door_signal.py](../demos/door_signal.py)（`--option-time`） | 不写文件，结果打印在终端 |
| 16.5 节“奖励中心化与价值尺度” | 三站循环（奖励 $0,0,1$）上未中心化的 $v_\gamma(A)$ 随 $\gamma$ 增大，$\gamma=.99$ 时 $32.999$；减去 $r(\pi)/(1-\gamma)$ 后 $A$ 为 $-.334$，三站分别趋于 $-1/3$、$0$、$1/3$ | 本课的计算：三状态确定性循环，$r(\pi)=1/3$；$\gamma$ 取 $.1$、$.3$、$.5$、$.7$、$.9$、$.95$、$.99$、$.999$，解线性方程求折扣价值与中心化价值，并核对两者之差为 $r(\pi)/(1-\gamma)$；确定性计算，无随机重复 | [demos/crl_v8_mechanisms.py](../demos/crl_v8_mechanisms.py) | [assets/crl-v8/discount-centering.csv](../assets/crl-v8/discount-centering.csv)；`--figures` 时写 [assets/crl-v8/reward-centering.png](../assets/crl-v8/reward-centering.png)；核对记录 [assets/crl-v8/checks.json](../assets/crl-v8/checks.json) |
| 16.7 节“平均奖励策略梯度与差分TD”与“策略更新与经验分布”（图 `policy-and-data.png`） | 梯度式与有限差分在 $\theta=0$ 时都为 $2/15$；一次更新后 $\tilde V(A)=.04$、$\bar R=.804$；配送概率 $.5\to.524979$，$d_\pi(B)$ 由 $.333333$ 变为 $.344253$，真实率由 $.8$ 变为 $.813104$，差分价值差由 $1.2$ 变为 $1.186896$ | 本课的计算：两状态配送链，在 A 选 F 留在 A 得 $.4$、选 D 到 B 得 $0$，B 回 A 得 $2$；策略 $p=\sigma(\theta)$，$\theta=0$；用旧评论者与旧率处理一次 D 转移，行动者步长 $.5$、价值步长 $.1$、率步长 $.01$；$\theta$ 在 $[-3,3]$ 上取 121 点画固定策略的率与 $d_\pi(B)$；确定性计算，无随机重复 | [demos/crl_v10_derivations.py](../demos/crl_v10_derivations.py) | [assets/crl-v10/results.json](../assets/crl-v10/results.json)（`delivery` 一项）、[assets/crl-v10/policy-and-data.csv](../assets/crl-v10/policy-and-data.csv)、[assets/crl-v10/policy-and-data.png](../assets/crl-v10/policy-and-data.png) |
| 16.5 节“接入控制排队”与“差分 Q 与 RVI Q” | 精确：最优率 $2.748$，最优策略外加 $\varepsilon=.1$ 探索 $2.647$，来者全收 $2.181$；最优门槛（优先级 1 一律拒，2 要剩至少 4 台，4、8 有空就收）。书例重跑：200 万步时 $\bar R$ 读数 $2.14$–$3.06$，均值 $2.67$，后 100 万步每步实收 $2.64$。Wan 等 §3 重跑：8 万步平均每步实收差分 Q $2.58$、RVI 常见参照 $2.60$、全表均值 $2.52$、罕见参照 $2.15$ | 书例 10.2：10 台服务器，付 $1/2/4/8$，忙的每台每步以 $.06$ 空出，先收客再空出，队首优先级均匀抽取；精确值为已知模型上的相对价值迭代。书例重跑：差分 Sarsa 表格版，$\alpha=.01$，率步长 $.01$，$\varepsilon=.1$，零初值，10 次独立运行各 200 万步。Wan 等：差分 Q 与 RVI Q（参照取单个状态动作对或全表均值），$\alpha=.025$，$\eta=.125$，$\varepsilon=.1$，30 次独立运行各 8 万步，每 2000 步记一点 | [demos/ch16_lit_access_control.py](../demos/ch16_lit_access_control.py) | [assets/ch16-lit-access-control/results.json](../assets/ch16-lit-access-control/results.json) |
| 16.5 节“Two Loop” | 三种策略的率 $1/5$、$2/5$、$3/10$；各一半策略下 $d\cdot v=0$ 的差分价值 $[-1/5,-7/5,-11/10,-4/5,-1/2,3/5,9/10,6/5,3/2]$；折扣下偏爱向右需 $\gamma>2^{-1/4}\approx.841$；平移后的价值误差降到 $.1$ 以下：差分 TD 约 $340$ 步，平均代价 TD 约 $630$ 步，1 万步时 $.007$ 与 $.011$ | Wan 等 §5 的 Two Loop：9 个状态，状态 0 向左得 $1$ 进 5 步环，向右得 $0$ 进另一 5 步环、回 0 时得 $2$；有理数精确计算。预测：评价各一半策略，差分 TD（$\alpha=.2$，$\eta=.25$）与平均代价 TD（$\alpha=.1$，$\eta=.125$），步长每步乘 $.9995$，零初值，30 次独立运行各 1 万步；误差先减 $c=\sum_z d_\pi(z)\tilde V(z)$ 再按 $d_\pi$ 加权求均方根 | [demos/ch16_lit_two_loop.py](../demos/ch16_lit_two_loop.py) | [assets/ch16-lit-two-loop/results.json](../assets/ch16-lit-two-loop/results.json) |
| 16.1 节（课件 `ch15-f02-rate`）；16.2 节（课件 `ch16-r21-bias-relation`） | 奖励率的滑动累计图、三种评分对照图、差分价值与折扣价值的关系图 | 本课的计算：仓库链上策略“转角总向左”的精确计算，无训练 | [demos/ch16_r21_figs.py](../demos/ch16_r21_figs.py) | [assets/ch16-r21/rate-running.pdf](../assets/ch16-r21/rate-running.pdf)、[assets/ch16-r21/three-scores.pdf](../assets/ch16-r21/three-scores.pdf)、[assets/ch16-r21/bias-discount.pdf](../assets/ch16-r21/bias-discount.pdf) |
| 16.1 节（课件 `ch16-r21-rate-discount`）；16.2 节（课件 `ch15-f02-bias`、`ch16-r21-poisson-chain`） | 仓库链的奖励率与折扣值；差分价值中的 $23/64$ 与 .92；泊松方程链例的 $5/8$ | 本课的计算：七状态仓库链，奖励记在离开状态的那一步，精确求解 | [demos/ch16_r21_numbers.py](../demos/ch16_r21_numbers.py) | 只在终端输出，不写文件 |
| 16.5 节（课件 `ch16-ladder`） | $\gamma=.9$ 学成后仍差天花板一成；$\gamma=.99$ 与学 $\bar R$ 学成后一样；差别按 Holm 校正判断 | 本课的模拟：四区仓库，200 万步不复位，付款规律固定为 R0，20 个种子 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch16` | [assets/crl-ladder-world/runs/formal-ch16.json](../assets/crl-ladder-world/runs/formal-ch16.json)、[assets/crl-ladder-world/fig/ladder-ch16.png](../assets/crl-ladder-world/fig/ladder-ch16.png) |

运行：
```sh
python3 demos/sample14_average_option.py    # 写 assets/sample14-avg-option，可用 --out 另写
python3 demos/door_signal.py --option-time  # 只打印
python3 demos/crl_v8_mechanisms.py --figures # 写 assets/crl-v8
python3 demos/crl_v10_derivations.py        # 写 assets/crl-v10
python3 demos/ch16_lit_access_control.py    # 文献原型：接入控制，写 assets/ch16-lit-access-control
python3 demos/ch16_lit_two_loop.py          # 文献原型：Two Loop，写 assets/ch16-lit-two-loop
python3 demos/ch16_r21_figs.py              # 写 assets/ch16-r21
python3 demos/ch16_r21_numbers.py           # 只打印
python3 demos/crl_ladder_learners.py --exp ch16 --seeds 20 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch16.json
python3 demos/crl_ladder_figures.py ch16           # 写 assets/crl-ladder-world/fig/ladder-ch16.png
```

## 第 17 章　流式学习与在线信用分配 {#ch-17}

本章来自本课程序的结果有：17.1 节的真实轨迹与配送迹，17.2 节的泥地目标分布，17.3 节之后的逐前缀等价核对，17.5 节 Stream-X 的尺度曲线，19 状态随机游走与真在线 TD 两个文献原型，以及 17.1 节四区仓库上支付延迟 20 步的阶梯实验。阶梯实验的三种改法由诊断程序另外运行，与学到延迟的那一种按种子配对。17.5 节引用的 Stream Q($\lambda$)、Stream-AC 与 ObGD 是原作者的代码，出处见表后。

其余数字由正文推导直接算出，包括路口一步 Sarsa 的写入、回放次序、.81 与 .5184、期望迹 .08、17.4 节离策略平均方向中的 $+.2w$、$-.016w$、$-3.4w$、$2^n-1$ 和尺度对照表。assets/crl-formal-maps 下的路口与迹示意图是手绘 SVG，没有绘图程序。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 17.1 节“重复访问下的线性资格迹” | 第 39,997 步在 A 原地停留、第 39,998 步离开 A、第 40,003 步到 C 的实际轨迹；该段上 $\lambda=.8$、$\alpha=.1$ 的迹 $.8^6+.8^5=.589824$ 由这段轨迹手算 | 本课的模拟：三站连续配送（Y 形格，打滑概率 .1，C 站到站奖励在第 60,000 步由 3 降为 .1），每次运行 120,000 个原始转移、不回放、不重置；不规划、规划（每完成一个选项另做 5 次模型备份）、冻结三种条件，独立重复 8 次。正文取规划条件种子 0 的第 39,996–40,002 行 | [crl_joint_v12.py](../demos/crl_joint_v12.py) | [raw-planning-seed0.npz](../assets/crl-joint-v12/raw-planning-seed0.npz)、[manifest.json](../assets/crl-joint-v12/manifest.json) |
| 17.1 节“资格迹与时间信用分配” | $\lambda=.5$、$\alpha=.8$ 时迹 $(.4,.8)$、误差 $.72$、增量 $(.40,.16)$；到站延续取 .5 时第三步的迹 $(1.125,.25)$ | 本课的计算：配送路线上的晚到信号，$\lambda$ 与到站延续系数各取课内给定的几档，逐步列出迹、误差与增量；确定性计算，无随机重复 | [delivery_trace.py](../demos/delivery_trace.py) | [steps.json](../assets/delivery-trace/steps.json)（六种组合） |
| 17.2 节“改走右边还缺什么证据”（课件 `ch15-f07-backup-depth-breadth`，加深与加宽） | 一步期望目标 .505、两步期望目标 .50905 | 本课的计算：泥地例，成功概率 .1，$\gamma=.9$，尾值 $v=.5$；对 $n=1,2,4,16$ 精确枚举目标分布的均值、方差与均方误差。单条路径的 .45、.405 由正文推导直接算出 | [course15_traces.py](../demos/course15_traces.py) | [report.json](../assets/course15-traces/report.json)（target_distributions）、[target-distribution.png](../assets/course15-traces/target-distribution.png) |
| 17.3 节“Dutch 迹与逐前缀前向计算的等价性”（课件 `course15-trace-true-online-check`） | 第 4 步后泥格 S4 的预测：普通累积迹 .7090，真在线 TD 与逐前缀前向重算 .6713，冻结表前向和（各次写入都按初表算再相加）.6966，离线 λ 回报（目标读初表，回合末按时间次序写入）.6718（`report.json` 的 `offline_final`） | 本课的计算：泥地例的四步轨迹，线性特征初值 $(.4,.5)$，$\alpha=.2$、$\gamma=.9$、$\lambda=.8$；确定性计算，另用 40 组随机线性特征核对前向与真在线结果一致 | [course15_traces.py](../demos/course15_traces.py)、[trace_walkthrough.py](../demos/trace_walkthrough.py)（课堂设定导出） | [report.json](../assets/course15-traces/report.json)、[four-step-trace.csv](../assets/course15-traces/four-step-trace.csv)、[online-equivalence.png](../assets/course15-traces/online-equivalence.png)、[prefixes.json](../assets/course15-traces/prefixes.json) |
| 17.5 节“Stream-X 的尺度控制” | $\alpha=.05$、$\beta=.9$；尖峰 $u=20$ 时固定步长位移为 1，峰值控制后的步长约 .05 | 本课的计算：给定增量序列（8 个 .2、一次 20、30 个 .2、一次 $-8$、20 个 $-.2$），逐步比较固定步长与逐坐标峰值控制；确定性计算 | [crl_v8_mechanisms.py](../demos/crl_v8_mechanisms.py) | [streaming-optimizer.csv](../assets/crl-v8/streaming-optimizer.csv)、[streaming-optimizer.png](../assets/crl-v8/streaming-optimizer.png)、[checks.json](../assets/crl-v8/checks.json) |
| 17.1 节“19 状态随机游走：误差隔约一百步才到”（课件 `ch17-lit-randomwalk`） | 离线 $\lambda$ 回报最好 .252（$\lambda=.8$，$\alpha=.4$）；$n$ 步 TD 最好 .255（$n=4$，$\alpha=.4$）；$\lambda=.9$ 时累积迹在 $\alpha=.65$ 误差 1.23、$\alpha\ge.75$ 发散，离线 $\lambda$ 回报全程不超过 .452 | 复现 Sutton 与 Barto 例 7.1 及图 7.2、12.3、12.6、12.8 的设定：19 状态、两端奖励 $-1$ 与 $+1$、$\gamma=1$、初值 0；$n=1\ldots512$，$\lambda\in\{0,.4,.8,.9,.95,.975,.99,1\}$，$\alpha=.05\ldots1$；100 次独立运行，每次 10 个回合，各参数用同一批游走；度量为每回合末 19 个状态的 RMS 误差，取前 10 个回合平均；另核对真在线 TD 与在线 $\lambda$ 回报逐步相同 | [ch17_lit_rw19.py](../demos/ch17_lit_rw19.py) | [rw19.json](../assets/ch17-lit-rw19/rw19.json) |
| 17.3 节“真在线 TD 的检验”（课件 `ch17-lit-true-online`） | 图 1 设定单次运行的阶梯 1→.727→.565→.522；1000 次平均的前三回合末误差，离线与真在线 .681、.495、.384，累积迹 .722、.574、.496；19 状态 $\lambda=.8$ 最好 RMS：离线 .252、累积迹 .253、真在线 .245、替换迹 .240，配对差（真在线−离线）$-.0074\pm.0009$、（替换迹−真在线）$-.0054\pm.0009$ | 复现 van Seijen 等（JMLR 2016）图 1 的设定：10 状态，.7 向左，每步奖励 1，$\gamma=\lambda=1$，$\alpha=.2$，从最右一格出发，初值取 0（本课假设）；单次运行 3 个回合，另 1000 次独立运行；19 状态部分同上一行 | [ch17_lit_rw19.py](../demos/ch17_lit_rw19.py) | [vs-fig1.json](../assets/ch17-lit-rw19/vs-fig1.json)、[rw19.json](../assets/ch17-lit-rw19/rw19.json)（paired_lambda_0.8 字段） |
| 17.1 节（课件 `ch17-ladder`） | 支付晚 20 步到账时，带迹的学习器 lifetime 率只到天花板的三成多；学到延迟到八成，比给定延迟少一成 | 本课的模拟：四区仓库，规律 R0，支付延后 20 步，200 万步，60 个种子；三种改法各 20 个种子，与学到延迟配对 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch17`；[demos/crl_ladder_diagnostics.py](../demos/crl_ladder_diagnostics.py) | [assets/crl-ladder-world/runs/formal-ch17.json](../assets/crl-ladder-world/runs/formal-ch17.json)、[assets/crl-ladder-world/fig/ladder-ch17.png](../assets/crl-ladder-world/fig/ladder-ch17.png)；assets/crl-ladder-world/runs/ 下的 diag-ch17_*.json |

运行：
```sh
python3 demos/crl_joint_v12.py
python3 demos/delivery_trace.py --export assets/delivery-trace/steps.json
python3 demos/course15_traces.py --out assets/course15-traces
python3 demos/trace_walkthrough.py --out assets/course15-traces/prefixes.json
python3 demos/crl_v8_mechanisms.py --figures
python3 demos/ch17_lit_rw19.py             # 文献原型：19 状态随机游走与真在线 TD，写 assets/ch17-lit-rw19
python3 demos/crl_ladder_learners.py --exp ch17 --seeds 60 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch17.json
python3 demos/crl_ladder_figures.py ch17           # 写 assets/crl-ladder-world/fig/ladder-ch17.png
python3 demos/crl_ladder_diagnostics.py --list   # 列出诊断档；单档用 --arms 档名 --seeds 20 运行
```

外部代码（出处）：17.5 的 Stream Q($\lambda$)、Stream-AC 与 ObGD 引自 Elsayed 等的 streaming-drl 仓库（github.com/mohmdelsayed/streaming-drl），提交 407dca7 中的 stream_q.py、optim.py、stream_ac_discrete.py，以及提交 9326fc3 中的 stream_ac_discrete.py、optimizer.py。

## 第 18 章　智能体状态的充分性 {#ch-18}

本章来自本课程序的结果有：18.1 节的三站路口图，18.4 节的两段历史图，18.5 节“看不清时：信念状态”中的信念柱状图与门口线索的期望收益，18.1–18.2 节的学习曲线与时间线配图，18.3 节一般的单智能体深度强化学习一类中大规模复杂环境里局部视野认得出位置的比例图，18.2 节四区仓库上局部观测的阶梯实验（含在精确模型上搜索无记忆策略与差分 Sarsa($\lambda$) 的诊断运行），18.4 节痕迹条件反射与 18.5 节罗盘世界两个文献原型的重跑，以及 18.6 节意外记忆实验的复现。意外记忆实验原来的脚本没有留下，复现由本课重写，300 次运行平均。

其余数字由正文推导直接算出，包括 18.1–18.3 节的 1/4、1/16、17/64 与 $5/8$ 对 $4/3$，18.3 节的指示对照表，18.5 节混叠损失在仓库两例上的下限 2 与 3/2，岭回归的 2/3、51/101、1/3、1/6，信念 4/5 与 3.4、1.6，选读一的回报分布，选读二的可行动作集，以及门口冻结预测器的期望平方误差 .09、.41、.25。18.1 节的配送经历图、18.3 节的判据图、18.5 节的混叠图与状态用途图是手绘 SVG，没有绘图程序。18.4、18.5 节引用的 SRM 99.7%、RTU 63%（Elsayed、Pham、Mahmood 2026）和 Jenkinson–Alvarez 的维数结果来自所引文献。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 18.1 节“补充例：三站地图上的最近服务站” | 三站共用路口 J 的地图：J 到 A、B、C 的支路分别为 2、1、4 个原始步，到站奖励 1、.2、3 → .1 | 本课的绘图：节点 A、a、J、B、c1、c2、c3、C 按程序中的坐标绘出，到站奖励按程序中的标签标注；确定性绘图 | [sample14_average_option.py](../demos/sample14_average_option.py) | [sample14-avg-map.png](../assets/sample14-avg-option/sample14-avg-map.png)、[sample14-avg-map.pdf](../assets/sample14-avg-option/sample14-avg-map.pdf) |
| 18.4 节“补充例：一步预测够用，递推却不够” | 末尾为 1 与 2 的两段历史一步预测分布相同，见到 3 以后需要不同的下一步预测 | 本课的绘图：按正文给定的两段历史与转移直接绘图；确定性绘图，程序为顶层脚本 | [continual_figures.py](../demos/continual_figures.py) | [state-recursion.png](../assets/continual/state-recursion.png)、[state-recursion.svg](../assets/continual/state-recursion.svg) |
| 18.5 节“看不清时：信念状态”中的“补充：两步预测与校正的数值” | 信念 $(.8,.2)\to(.76,.24)\to(19/73,54/73)\approx(.2603,.7397)$ 的三组柱 | 本课的绘图：转移矩阵两行 $(.9,.1)$、$(.2,.8)$，反馈似然 $(.1,.9)$；三组概率由正文推导直接算出后写入绘图程序，加 `--figures` 时才绘图 | [continual_v6_calculations.py](../demos/continual_v6_calculations.py) | [belief-update.png](../assets/continual/v6/belief-update.png)、[belief-update.svg](../assets/continual/v6/belief-update.svg)、[manifest.json](../assets/continual/v6/manifest.json) |
| 18.5 延伸「门口线索的价值与长期路线选择」与「决策记忆与长期路线选择」 | 读到“宽”时直行期望 $1.60q-1$；$q=.60$ 时两种读数直行分别为 $-.04$、$-.36$，都应绕行；$q>5/8$ 时直行才严格胜出；标记准确时每处门口最多 .30，忘记标记时最好为 0；始终直行每处 $-.20$，长期每步奖励从 $-.10$ 提高到 .15 | 本课的计算：宽、窄门各半且独立，直行得 1、告警扣 4、绕行得 0，宽门、窄门告警概率 .10、.50；标记正确率 $q$ 取 .5 到 1 之间间隔 1/40 的 21 档，精确计算各读数下的直行收益与最优收益；另比较每处门口两个原始步时的长期奖励率。结果文件中的在线学习部分为 64 个独立种子，正文这里只用精确值 | [door_signal.py](../demos/door_signal.py) | [reader.json](../assets/door-signal/reader.json)（observed 下标 24、25、40 对应 $q=.60$、.625、1，blind 为不读标记） |
| 18.4 节“要记多久：痕迹条件反射”中的“本课重跑” | 后半段 MSRE：presence .137 / .226 / .269，微刺激 .033 / .041 / .047，痕迹瓦片 .036 / .034 / .034（ISI 均值 10 / 20 / 30）；presence 的误差与回报方差 .149 / .224 / .261 相当；附中档 ISI 一个试次的预测曲线 | 照 Rafiee 等（Adaptive Behavior，2023）trace conditioning：CS 4 步、US 2 步、ISI 三档均匀分布、ITI U(80,120)、10 个干扰；γ=1−1/E[ISI]；线性 TD(λ)，λ=.9，普通步长在五个候选中按 3 次 × 5 万步试跑选出；微刺激 16 个基、宽度 .08；痕迹瓦片 2 层 × 16 格；10 次独立运行，各 20 万步（原文 200 万步 × 30 次、Adam）；只重跑固定表示 | [ch18_lit_trace.py](../demos/ch18_lit_trace.py) | [results.json](../assets/ch18-lit-trace/results.json) |
| 18.5 节“以预测为状态：罗盘世界”中的“本课重跑” | 25 个朝向类节点的均方根误差 1k / 10k / 50k / 100k / 200k / 300k 步为 .409 / .318 / .061 / .053 / .019 / .017；后 15 万步朝向类 .021（只看观测 .312），一步节点 .108（只看观测 .184）；原地顺时针转 26 次，Forward 节点 26 次都报对墙色 | 照 Sutton、Rafols 与 Koop（NIPS 18，2005）部分可观测实验：6×6，6 个颜色比特，F / L / R 概率 .5 / .25 / .25，滑动 .1；每色 8 个问题节点共 40 个，答案网络按上一步动作分三组共 138 维输入，logistic 输出；选项内 TD(λ)，λ=.9，步长 1；10 次独立运行，各 30 万步 | [ch18_lit_compass.py](../demos/ch18_lit_compass.py) | [results.json](../assets/ch18-lit-compass/results.json) |
| 18.1 节“两种状态上的一次预测更新”（课件 `ch15-f03-learning`）；18.2 节（课件 `ch15-shared-state-interference`）；18.3 节“单智能体深度强化学习：状态也要学”（课件 `ch18-r21-survey-grid`） | 分组表与单表预报值随趟数变化的曲线；lifetime 16 步的奖励时间线，20 与 $331/32$；大规模复杂环境里局部视野在全图独一无二的格所占比例（一般的单智能体深度强化学习调研页） | 本课的计算：学习曲线中头两趟取 L、R，其后 18 次线索由 `random.Random(18)` 生成，单表与分组表步长 .5，另画步长 $1/(n+1)$ 递减的单表；时间线对 16 步精确求期望，程序断言 $J=20$ 与 $331/32$；比例图用边长 $n\in\{17,33,65,129,257\}$ 的房间世界，每隔 8 格一道墙（房间内部 7×7），门位随机，3 个种子，窗口 3×3 到 9×9；无训练，运行时打印核对 | [demos/ch18_r21_figs.py](../demos/ch18_r21_figs.py) | [assets/ch18-r21/learn-curves.pdf](../assets/ch18-r21/learn-curves.pdf)、[assets/ch18-r21/timeline16.pdf](../assets/ch18-r21/timeline16.pdf)、[assets/ch18-r21/grid-alias.pdf](../assets/ch18-r21/grid-alias.pdf) |
| 18.2 节（课件 `ch18-ladder`、`ch18-r21-ladder-learner`） | 局部 $3\times3$ 观测下，记住上次交货的站使每步奖励由天花板（.1298）的 2.6% 升到 28.6%；不随机探测时在“局部观测加上次的站”上搜到每步 .1326 的无记忆策略；差分 Sarsa($\lambda=.9$) 12 个种子到天花板的 54%，差分 Q 为 29%，配对差 $+.0326\pm.0024$ | 本课的模拟：四区仓库，200 万步，规律 R0，局部 $3\times3$ 观测，20 个种子；无记忆策略在精确模型上做策略梯度 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch18`；[demos/crl_ladder_memoryless.py](../demos/crl_ladder_memoryless.py)；[demos/crl_ladder_diagnostics.py](../demos/crl_ladder_diagnostics.py) | [assets/crl-ladder-world/runs/formal-ch18.json](../assets/crl-ladder-world/runs/formal-ch18.json)、[assets/crl-ladder-world/fig/ladder-ch18.png](../assets/crl-ladder-world/fig/ladder-ch18.png)、[assets/crl-ladder-world/memoryless.json](../assets/crl-ladder-world/memoryless.json)；runs/diag-ch18_local_given-sarsa0.9.json |
| 18.6 节（课件 `ch18-surprise-experiment`） | 18.6 节的表：$\gamma=.72$ 时固定探索率 .05、.1、.19、.2、.3 得 2682、3073、3171、3165、3034，翻转后 2000 步 1585、1923、2043、2043、1979；一位意外记忆得 3365，翻转后 2254；按步数算意外位打开的比例 .252 | 本课的模拟：表格 Sarsa，$\alpha=.1$，零初值，第 1000 步起规则反过来，300 次独立运行平均，标准误在 24 以内。原实验的程序没有留下，本程序是重写的；$\gamma=.72$ 使固定探索率四行与原运行（2604、3083、3197、3062）相差在 3% 以内。页上的曲线与敏感度的数取自原运行，本程序不复算 | [demos/ch18_surprise_bit.py](../demos/ch18_surprise_bit.py) | 只在终端输出，不写文件 |

运行：
```sh
python3 demos/sample14_average_option.py
python3 demos/door_signal.py --reliability 3/5
python3 demos/door_signal.py --option-time
python3 demos/door_signal.py --export assets/door-signal/reader.json
python3 demos/ch18_lit_trace.py            # 文献原型：痕迹条件反射，写 assets/ch18-lit-trace
python3 demos/ch18_lit_compass.py          # 文献原型：罗盘世界，写 assets/ch18-lit-compass
python3 demos/ch18_r21_figs.py             # 写 assets/ch18-r21
python3 demos/crl_ladder_learners.py --exp ch18 --seeds 20 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch18.json
python3 demos/crl_ladder_figures.py ch18           # 写 assets/crl-ladder-world/fig/ladder-ch18.png
python3 demos/crl_ladder_memoryless.py     # 写 assets/crl-ladder-world/memoryless.json
python3 demos/ch18_surprise_bit.py         # 可加折扣因子，默认 .72；只打印
```

## 第 19 章　通用价值函数 {#ch-19}

本章来自本课程序的结果有：19.3 节的实际行程与路线传播图，19.4 节门口实验的探索概率，19.6 节的仓库实验（含四区仓库上的阶梯实验），以及开放问题一节的世界甲、乙。

其余数字由正文推导直接算出，包括 19.1 节的 65/32 与 2/8，19.3 节的 TD 表 .60 → .40、2.00 → 2.25 与 $v(A)=5$ 时的目标 6、7 和更新值 5.2、5.4，19.4 节比率为 4 的一步中的 .64、2.2、1.6，19.2、19.4 节期限、预算与不完全核验下的概率，19.3 节延伸中事件概率的 .08 与 .54，19.4 节延伸门口例的 $-.20$ 与 .30，19.5 节重新计价的 $9-6p$、$6-2p$ 与交点 $p=.75$。19.1 节的八步轨迹信号图和 19.2 节的三种学法图是手绘 SVG，没有绘图程序。19.4 节中 Horde 的 85 ms 来自所引文献。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 19.3 同一次访问上的 TD 与蒙特卡洛目标 | 第 39,997 步仍在 A、第 40,003 步到 C 的实际行程，时长样本 7 | 本课的模拟：三站连续配送（Y 形格，打滑概率 .1，C 站到站奖励在第 60,000 步由 3 降为 .1），每次运行 120,000 个原始转移、不回放、不重置；不规划、规划、冻结三种条件，独立重复 8 次。正文取规划条件种子 0 的这一段 | [crl_joint_v12.py](../demos/crl_joint_v12.py) | [raw-planning-seed0.npz](../assets/crl-joint-v12/raw-planning-seed0.npz)、[manifest.json](../assets/crl-joint-v12/manifest.json) |
| 19.3 自举信息沿路线的传播 | 第 1、6、30 次去 C 之后的时长与奖励预测曲线；第一次到 C 只使 $c_3$ 处奖励预测变为 .6 | 本课的计算：A 到 C 的确定性去程 6 步，末步奖励 3，到 C 时延续为 0；表格初值为 0，步长 .2；200 次往返共 2,400 个原始转移，其中 1,200 个去程转移更新两个头；在第 1、6、30、200 次后取快照；确定性计算 | [v18_systems.py](../demos/v18_systems.py) | [gvf-route-learning.png](../assets/v18-systems/gvf-route-learning.png)、[gvf-route-updates.csv](../assets/v18-systems/gvf-route-updates.csv)、[gvf-roundtrip-transitions.csv](../assets/v18-systems/gvf-roundtrip-transitions.csv)、[checks.json](../assets/v18-systems/checks.json) |
| 19.4 节延伸“门口的目标策略覆盖、预测选取与测试”中的门口实验 | 贪心选绕行时仍以 $.1\times.5=.05$ 的概率探索直行 | 本课的模拟：每趟门口选路以概率 .1 探索，探索时以 .5 的概率直行，其余按当前动作价值（按读到的标记分组的样本均值）贪心；完整路线作为一次选择，只用所选路线的反馈学习；保留与不保留线索两组各走至多 512 趟，独立重复 64 次 | [door_signal.py](../demos/door_signal.py) | [reader.json](../assets/door-signal/reader.json) |
| 19.6 节“两种提出方式的实验”（课件 `ch19-discovery-experiment`） | 前 3000 步全程回报：无辅助 1887、设计者给出 3202、意外触发 3311、看见指示 3321；意外触发减随机提出 $646\pm115$（$\pm$ 后为标准误，95% 区间 411 到 880） | 本课的模拟：仓库 $D\to J$，转角处线性 Sarsa 读预测问题的答案，8 个槽，门槛 1，每 100 步替换一次；30 对独立运行 | [ch19_warehouse_questions.py](../demos/ch19_warehouse_questions.py)、[ch19_warehouse_main.py](../demos/ch19_warehouse_main.py) | [ch19_warehouse_main.json](../assets/ch19-warehouse-questions/ch19_warehouse_main.json) |
| 19.6 节“有用怎么量”的代理表与“两种提出方式的实验”（课件 `ch19-question-replace`、`ch19-discovery-experiment`） | 六个问题的代理，单独读入与六个同读两种（如两步内到 $B$ 为 2.29 与 1.06）；持有有用问题的运行比例：意外触发从第 100 步起全部持有，随机提出到第 3000 步为 87%；$10^5$ 步长程中差停在 735 附近，末一万步两者每步奖励都是 1.24。`ch19_warehouse_redundancy.py` 的两项同读与只读一项对照（多 81，标准误 17）现行讲义与课件未用 | 同上一行的仓库，30 对 | [ch19_warehouse_extra.py](../demos/ch19_warehouse_extra.py)、[ch19_warehouse_redundancy.py](../demos/ch19_warehouse_redundancy.py)、[ch19_warehouse_long.py](../demos/ch19_warehouse_long.py) | [ch19_warehouse_extra.json](../assets/ch19-warehouse-questions/ch19_warehouse_extra.json)、[ch19_warehouse_redundancy.json](../assets/ch19-warehouse-questions/ch19_warehouse_redundancy.json)、[ch19_warehouse_long.json](../assets/ch19-warehouse-questions/ch19_warehouse_long.json) |
| 开放问题“能分开提出方式的世界”：世界甲与奖励噪声 | $D_2$ 阶段意外触发减只给 $D_1$ 为 1010（985 到 1034）；七种做法分三段的全程回报；$\sigma_r=0,.5,1,2$ 时的优势、候选数与有用比例 | 本课的模拟：$B\to D_1\to D_2\to J$，每 3000 步换一次哪一格如实显示；学习器同 19.6 节；学习进度按误差平方快、慢滑动平均之差替换；10 对预试定数，100 对独立运行 | [ch19_open_worlds.py](../demos/ch19_open_worlds.py) | [ch19-open-worlds-pilot.json](../assets/ch19-open-worlds/ch19-open-worlds-pilot.json)、[ch19-open-worlds-results.json](../assets/ch19-open-worlds/ch19-open-worlds-results.json) |
| 开放问题“能分开提出方式的世界”：世界乙 | 组合提出减单项 892（865 到 919）；上限减组合提出 108（72 到 144） | 本课的模拟：选路由两格读数的异或决定；组合提出以 .2 的概率把已留问题拼成双起点问题；100 对独立运行；端到端循环编码器未跑 | [ch19_open_worlds.py](../demos/ch19_open_worlds.py) | 同上一行 |
| 19.6 节（课件 `ch19-ladder`） | 六十个种子都挑中“到充电桩的步数”这一问题，与设计者给定的问题结果相同；换成模型后 lifetime 率多 .0054 | 本课的模拟：四区仓库，200 万步，规律 R0，60 个种子；天花板 .1134 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch19` | [assets/crl-ladder-world/runs/formal-ch19.json](../assets/crl-ladder-world/runs/formal-ch19.json)、[assets/crl-ladder-world/fig/ladder-ch19.png](../assets/crl-ladder-world/fig/ladder-ch19.png) |

运行：
```sh
python3 demos/crl_joint_v12.py
python3 demos/v18_systems.py
python3 demos/door_signal.py --reliability 3/4
python3 demos/ch19_warehouse_main.py         # 写 assets/ch19-warehouse-questions
python3 demos/ch19_warehouse_extra.py
python3 demos/ch19_warehouse_redundancy.py
python3 demos/ch19_warehouse_long.py         # 10 万步，较慢
python3 demos/ch19_open_worlds.py pilot      # 10 对预试
python3 demos/ch19_open_worlds.py full 100   # 写 assets/ch19-open-worlds
python3 demos/crl_ladder_learners.py --exp ch19 --seeds 60 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch19.json
python3 demos/crl_ladder_figures.py ch19           # 写 assets/crl-ladder-world/fig/ladder-ch19.png
```

## 第 20 章　状态构造与表示学习 {#ch-20}

本章来自本课程序的结果有：20.3 节截断敏感度的数例，20.4、20.5 节的两张机制图及其数值，20.4 节的仓库实验与敏感性分析，开放问题“世界丙”，循环世界与生成与检验两个文献原型，20.5 节四区仓库上指示灯含义翻转的阶梯实验，以及线性与非线性读出的对照。最后一项中章首的风险曲线按公式精确计算，关系翻转后的恢复是 50 个种子的模拟。

20.3 节的风险表与平衡点 $\psi^\star=.6$、20.4 节三种做法的停点与每趟 $J$（$2.983$、$3.098$、$3.185$）、开放问题中的 $.6^8\approx.017$ 由正文推导直接算出。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 20.3 节“敏感度的代价”（课件 `ch17-sensitivity-example`） | $\psi=.5$、$c=+1$、$Y=1$ 时 $z_E=.5$、$z_J=.25$、$p=.625$，$\partial\ell/\partial z_J=-.1875$；完整敏感度 1、梯度 $-.1875$；只回传最后一步时敏感度 .5、梯度 $-.09375$ | 本课的计算：D 与 J 之间加一格走廊 E，$z_E=\psi c$、$z_J=\psi^2c$，$c=\pm1$ 两种来路各算一次，读出 $p=(1+z_J)/2$，平方损失；完整导数、截断导数与中心有限差分对照；程序另按步长 .2 更新一次 $\psi$（.5→.5375），现行正文未用；确定性计算 | [demos/v19_continual.py](../demos/v19_continual.py) | [assets/v19-continual/memory-gradient.csv](../assets/v19-continual/memory-gradient.csv)；[assets/v19-continual/checks.json](../assets/v19-continual/checks.json)；[assets/v19-continual/memory-through-time.png](../assets/v19-continual/memory-through-time.png)（现行课件与讲义未用） |
| 20.4 节“共享特征对不同读出的影响” | 只按时长损失走一步，$\psi$ 由 1 到 $1.06$；时长预测 $6.36$，奖励预测 $3.18$，去 $C$ 概率 $.529964$ | 本课的计算：取三站实验记录（种子 0、规划组）中第 40,003 步结束的一次 $A\to C$ 执行，$G=3$、$\tau=7$；单参数局部模型 $6\psi$、$3\psi$、$\operatorname{sig}(2\psi-2)$，步长 $.01$ | [demos/v19_continual.py](../demos/v19_continual.py)；记录由 [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) 产生 | 输入 [assets/crl-joint-v12/one-real-transition.json](../assets/crl-joint-v12/one-real-transition.json)；输出 [assets/v19-continual/shared-update-readers.png](../assets/v19-continual/shared-update-readers.png)、[assets/v19-continual/checks.json](../assets/v19-continual/checks.json) |
| 20.6 节“表示变换与预测头适配” | 两状态预测 $(1,-1)$；只旋转表示、保留旧读出得 $(-1,-1)$；读出同步变换后回到 $(1,-1)$ | 本课的计算：单位特征 $\mathbf x(A),\mathbf x(B)$，读出 $\mathbf w=(1,-1)^\top$，旋转 $90^\circ$；精确计算，无采样 | [demos/crl_v10_derivations.py](../demos/crl_v10_derivations.py) | [assets/crl-v10/representation-readout.png](../assets/crl-v10/representation-readout.png)；[assets/crl-v10/results.json](../assets/crl-v10/results.json)（`checks` 中 `invertible_representation_can_preserve_predictions`） |
| 20.4 节仓库实验（课件 ch20-fixed-vs-learned、ch20-remedies-compared） | 反转前后各 3000 步：固定 $\psi=.6$ 为 2626/1207，固定 $\psi=1$ 为 2818/1132，分开管 2609/2822，小权重 2690/2870，端到端 2787/2758，不写入 1876/1881；6000 步世界不变的对照 5546、5796、5513、5625、5757、3757 | 本课的模拟：有噪指示的仓库，$\kappa$ 在第 3000 步由 .8 变为 .2；REINFORCE 学 $\theta$，各学习器只在 $\psi$ 的学法上不同；每种 300 次独立运行 | [ch20_noisy_cue.py](../demos/ch20_noisy_cue.py) | [ch20_noisy_cue_6000_3000_0.2.json](../assets/ch20-noisy-cue/ch20_noisy_cue_6000_3000_0.2.json)、[ch20_noisy_cue_6000_6000_0.8.json](../assets/ch20-noisy-cue/ch20_noisy_cue_6000_6000_0.8.json) |
| 20.4 节“两种办法的得失与固定记忆的对照”中的“敏感度”一段 | $a_c$、$a_p$、$\theta_0$ 与小权重 $\lambda$ 改变时的同一组对照 | 同上一行，每种 200 次 | [ch20_noisy_cue_sensitivity.py](../demos/ch20_noisy_cue_sensitivity.py) | [ch20_noisy_cue_sensitivity.json](../assets/ch20-noisy-cue/ch20_noisy_cue_sensitivity.json) |
| 开放问题“世界丙” | 小权重减固定 $\psi=1$ 的 $L\times M$ 表（如 $L=1,M=3000$ 为 8838，$L=8$ 不翻为 $-2679$）；缩小步长的补救；两个槽下不替换、按使用度、按回本账的全程回报 | 本课的模拟：走廊长 $L\in\{1,2,4,8\}$，写入噪声 .1，指示可靠度每 $M$ 步在 .8、.2 间翻；30000 步，10 次预试定数，每格 100 次独立运行；回本账的租金 .02、上限 20、反事实功劳乘 3 是本课的设计选择；`check` 在 $L=1$ 时与 20.4 节的数相差不到 40：它与 ch20_noisy_cue.py 抽随机数的顺序不同，两个程序都保留 | [ch20_open_world_c.py](../demos/ch20_open_world_c.py) | [ch20-open-world-c-pilot.json](../assets/ch20-open-world-c/ch20-open-world-c-pilot.json)、[ch20-open-world-c-results.json](../assets/ch20-open-world-c/ch20-open-world-c-results.json) |
| 20.2 节文献原型“循环世界”（课件 ch20-lit-cycle-world） | 达到 RMSE $<.05$ 的步数：$\lambda=1$ 为 6,000，$.75$ 为 14,500，$.5$ 为 75,500；$\lambda=.25$ 在 150 万步内未达（停在约 .25），$\lambda=0$ 在 100 万步内未达（约 .31）；原文图 5 为不到 5,000、约 7,000、约 32,000、约 189,000、失败 | 本课按 Tanner 与 Sutton（ICML 2005）图 3 伪代码重跑：6 状态确定循环、1 个观测位，5 个预测的链式问题网络，输入为观测指示与上一步预测共 7 维，初始权重 $1/7$，上一步预测初值 0；$\alpha\in\{.5,.25,.125,.0625\}$ 取最好；每 500 步平均一点；导数因子按式 (7)，另记伪代码字面读法；世界确定，各 1 次运行 | [ch20_lit_cycle_world.py](../demos/ch20_lit_cycle_world.py) | [results.json](../assets/ch20-lit-cycle-world/results.json) |
| 20.5 节文献原型“生成与检验”（课件 ch20-lit-generate-test） | 最后 1 万个样本的平均 MSE：F:100 为 2.59，F:1K 为 1.86，F:10K 为 1.66，S:100 为 1.76，S:1K 为 1.33（最小可能为 1）；开头 1 万个样本 S:1K 为 2.23、F:1K 为 2.07 | 本课按 Mahmood 与 Sutton（AAAI 2013 Workshop）缩小重跑：20 个二值输入，目标由 20 个随机阈值单元（参数 .6）加 $N(0,1)$ 噪声；学习器阈值单元 $\beta=.6$、$\eta=.1$，每样本替换比例 1/200，按 $|w|$ 检验，成熟门槛 $\mu=100$ 由 S:1K 上 5 万样本 × 5 次的预试从 {20, 100, 500} 选出；每配置 10 次独立运行、各 100 万个样本；原文的 F:100K、F:1M 与 50 次运行未跑 | [ch20_lit_generate_test.py](../demos/ch20_lit_generate_test.py) | [results.json](../assets/ch20-lit-generate-test/results.json) |
| 20.5 节（课件 `ch20-ladder`） | 灯的含义翻转后，把预测放进状态的学习器能跟上，只放灯本身的跟不上；生成与检验每个种子都挑中灯，比不看灯低 .0024 | 本课的模拟：四区仓库，200 万步，20 个种子；另有 500 万步的一组运行 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch20`；[demos/crl_ladder_diagnostics.py](../demos/crl_ladder_diagnostics.py) | [assets/crl-ladder-world/runs/formal-ch20.json](../assets/crl-ladder-world/runs/formal-ch20.json)、[assets/crl-ladder-world/fig/ladder-ch20.png](../assets/crl-ladder-world/fig/ladder-ch20.png)、[assets/crl-ladder-world/runs/formal5m-ch20.json](../assets/crl-ladder-world/runs/formal5m-ch20.json)；runs/ 下的 diag-ch20_*.json |
| 20.5 节（课件 `ch20-r21-linear-nonlinear-example`） | 一步走廊（读出对参数线性）与两步走廊（非线性）的平方风险对照；关系翻转后约 2400 趟恢复 | 本课的计算与模拟：$\alpha=.2$，每段 2000 趟，50 个种子；章首风险曲线按公式精确计算 | [demos/ch20_r21_figs.py](../demos/ch20_r21_figs.py) | [assets/ch20-r21/risk-curves.pdf](../assets/ch20-r21/risk-curves.pdf)、[assets/ch20-r21/linear-nonlinear.pdf](../assets/ch20-r21/linear-nonlinear.pdf) |

运行：
```sh
python3 demos/v19_continual.py        # 读 assets/crl-joint-v12，写 assets/v19-continual
python3 demos/crl_v10_derivations.py  # 写 assets/crl-v10
python3 demos/ch20_noisy_cue.py 6000 3000 0.2   # 写 assets/ch20-noisy-cue
python3 demos/ch20_noisy_cue.py 6000 6000 0.8
python3 demos/ch20_noisy_cue_sensitivity.py
python3 demos/ch20_open_world_c.py check        # 对照 20.4 节的数；随机数顺序不同，相差不到 40
python3 demos/ch20_open_world_c.py full 100     # 写 assets/ch20-open-world-c
python3 demos/ch20_lit_cycle_world.py      # 文献原型：循环世界，写 assets/ch20-lit-cycle-world
python3 demos/ch20_lit_generate_test.py    # 文献原型：生成与检验，写 assets/ch20-lit-generate-test
python3 demos/crl_ladder_learners.py --exp ch20 --seeds 20 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch20.json
python3 demos/crl_ladder_learners.py --exp ch20 --seeds 20 --seed0 100 --steps 5000000 --tag formal5m   # 500 万步的一组，写 assets/crl-ladder-world/runs/formal5m-ch20.json（约 15 分钟）
python3 demos/crl_ladder_figures.py ch20           # 写 assets/crl-ladder-world/fig/ladder-ch20.png
python3 demos/ch20_r21_figs.py             # 写 assets/ch20-r21
```

## 第 21 章　技能与时间抽象 {#ch-21}

本章来自本课程序的结果有：去 $C$ 子任务的训练快照与三路信号，双房间后继表示的误差，21.6 节技能去留的配对实验，四房间与 eigenoption 两个文献原型，以及 21.6 节四区仓库上不规划时三种选项与原始动作的阶梯比较；差值点图只读已有的运行记录。

“技能省在哪里”的走廊均值 $110$ 与 $2^{-10}$、$17/24$、$-5+2\times2$ 等小算例由正文推导直接算出。章首四房间同步值迭代的 20 轮与 8240 次备份，程序暂未收入本附录。Option-Critic、Eigenoptions 与 DCEO 的实现是原作者的代码，出处见表后。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 21.2 节“随机执行时长与差分TD目标”“内部奖励、任务奖励与执行时长” | 去 $C$ 子任务第 1、20、2400 段训练后的内部动作价值快照；自 $t=14$ 起一次 $A\to C$ 执行的位置、内部信号、主奖励与时间计数（到 $C$ 一步奖励 3，共 6 步） | 本课的确定性模拟（种子 1429）：三站线路，部署前为三个目的站各练 2,400 个可重置回合，按每步 $-1$ 的内部信号学习，$\varepsilon=.3$，内部步长 $.25$，每回合至多 150 步，共 33,965 个原始步；部署后环境连续运行，不重置 | [demos/sample14_average_option.py](../demos/sample14_average_option.py) | [assets/sample14-avg-option/sample14-manifest.json](../assets/sample14-avg-option/sample14-manifest.json)；[assets/sample14-avg-option/sample14-option-skill-updates.csv](../assets/sample14-avg-option/sample14-option-skill-updates.csv)；[assets/sample14-avg-option/sample14-option-events.csv](../assets/sample14-avg-option/sample14-option-events.csv)；图 [sample14-option-skill.png](../assets/sample14-avg-option/sample14-option-skill.png)、[sample14-option-three-signals.png](../assets/sample14-avg-option/sample14-option-three-signals.png) |
| 21.5 节“子目标的五种来源”后“技能占用有限容量的机会成本” | 双房间 41 个状态上的访问估计，20 万次转移后相对真后继矩阵的误差 $.0380$ | 本课的模拟（种子 141908）：均匀随机原始动作，$\gamma=.9$，逐状态步长 $.8/N(s)^{.55}$ 的 TD 更新；真后继矩阵只用于评价 | [demos/crl_v8_mechanisms.py](../demos/crl_v8_mechanisms.py) | [assets/crl-v8/sr-learning.csv](../assets/crl-v8/sr-learning.csv)；[assets/crl-v8/manifest.json](../assets/crl-v8/manifest.json)（`sr_option`） |
| 21.6 节“技能的去留”（课件 ch21-keep-drop） | 每条 lifetime 排序试练减只用原始动作：试练窗口内 $-342.5\,[-376.2,-308.9]$，窗口外 $+167.8\,[73.9,261.7]$，净值 $-174.7\,[-300.7,-48.7]$，折合每步 $-.0213\,[-.0367,-.0059]$；练习约 1082 步、其间实收约 950；排序减均匀每步 $+.0848\,[.0700,.0995]$ | 本课的模拟：仓库连五条支路，每条深 3 步，到站奖励为 $1,2,3,4,6$ 的随机排列；差分 Q 学习，步长 $.15$，探索率 $.1$；一个技能名额；前 256 步共同随机探索，此后每 512 步开一个 128 步试练窗口（64 步练、64 步估计）；每条 lifetime 8192 步，配对 lifetime 独立重复 64 次，95% 配对 $t$ 区间。窗口内外的分解取 `runs.csv` 中 `window_reward`、`outside_window_reward` 两列逐种子相减 | [demos/crl_skill_discovery_trial.py](../demos/crl_skill_discovery_trial.py) | [assets/crl-skill-discovery-trial/runs.csv](../assets/crl-skill-discovery-trial/runs.csv)；[assets/crl-skill-discovery-trial/summary.json](../assets/crl-skill-discovery-trial/summary.json)；[assets/crl-skill-discovery-trial/protocol.md](../assets/crl-skill-discovery-trial/protocol.md)；[assets/crl-skill-discovery-trial/README.md](../assets/crl-skill-discovery-trial/README.md) |
| 21.2 节（课件 ch21-lit-fourrooms） | 同步值迭代准确格数（H 5 轮、A 29 轮）；SMDP Q 学习首幕与末百幕步数（G1/G2 × A、H、A∪H） | 本课的模拟：104 格四房间，动作 2/3 按意图、各 1/9 滑向其余三向，8 项门口技能，$\gamma=.9$；规划为确定的计算；学习 $\varepsilon=.1$，步长取原文各组最佳，30 次独立运行，各 1000 幕 | [demos/ch21_lit_fourrooms.py](../demos/ch21_lit_fourrooms.py) | [assets/ch21-lit-fourrooms/results.json](../assets/ch21-lit-fourrooms/results.json) |
| 21.5 节（课件 ch21-lit-eigenoption） | 扩散时间：动作 620.8，$k=2$ 至 128 项 eigenoption，瓶颈 option 1864.1；第 5 个特征向量的停点 | 本课的计算：同一布局、确定性移动，归一化拉普拉斯特征向量正反两向，内部折扣 .9；解线性方程，无随机误差 | [demos/ch21_lit_eigenoption.py](../demos/ch21_lit_eigenoption.py) | [assets/ch21-lit-eigenoption/results.json](../assets/ch21-lit-eigenoption/results.json) |
| 21.6 节（课件 `ch21-ladder`） | 不规划时，三种选项与只用原始动作的 lifetime 奖励率差都在 $\pm.002$ 以内（差值点图） | 本课的模拟：四区仓库，200 万步，49 个种子，同种子配对 t 区间；点图只读已有运行记录 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch21`；[demos/crl_ch21_ladder_dots.py](../demos/crl_ch21_ladder_dots.py) | [assets/crl-ladder-world/runs/formal-ch21.json](../assets/crl-ladder-world/runs/formal-ch21.json)、[assets/crl-ladder-world/fig/ch21-ladder-dots.pdf](../assets/crl-ladder-world/fig/ch21-ladder-dots.pdf) |

运行：
```sh
python3 demos/sample14_average_option.py           # 写 assets/sample14-avg-option
python3 demos/crl_v8_mechanisms.py --figures       # 写 assets/crl-v8，含 sr-learning.png
python3 demos/crl_skill_discovery_trial.py         # 64 对 × 8192 步，写 assets/crl-skill-discovery-trial
python3 demos/ch21_lit_fourrooms.py        # 文献原型：四房间，写 assets/ch21-lit-fourrooms
python3 demos/ch21_lit_eigenoption.py      # 文献原型：eigenoption，写 assets/ch21-lit-eigenoption
python3 demos/crl_ladder_learners.py --exp ch21 --seeds 49 --seed0 100 --steps 2000000 --tag formal   # 写 assets/crl-ladder-world/runs/formal-ch21.json
python3 demos/crl_ch21_ladder_dots.py      # 读 formal-ch21.json，写 assets/crl-ladder-world/fig/ch21-ladder-dots.pdf
```

外部代码（出处）：21.4 节 Option-Critic 的四房间迁移实验链接到作者仓库 jeanharb/option_critic 中的 `transfer.py`；21.5 节 Eigenoptions 一节的实现见 Machado 等的仓库 mcmachado/options，DCEO 一节见 mklissa/dceo。

## 第 22 章　技能模型与规划 {#ch-22}

本章来自本课程序的结果有：三站实验中的一次完成调用，奖励改变前后的模型读出与行为，双房间后继表示与特征方向技能，22.8 节规划读模型的配对实验，三个文献原型（22.2 节四房间上的差分 Q 选项学习、22.6 节堵路迷宫、22.8 节两房间），以及 22.8 节四区仓库上选项规划与原始动作规划的阶梯比较。阶梯比较是初步结果，四个 $h$ 各检验一次，未做多重比较校正。

固定步长 $\alpha=.2$ 的演算（$2.6$、$6.2$）、门槛 $3.4$ 与 $6.8$ 步、自测第 7 题的 $10.2$ 与 $4.2$ 由正文推导直接算出。22.6 节调用检验的模拟（改版前后预测用时之差与报警，4000 次运行），程序暂未收入本附录。22.7 节子目标模型的四面板图取自 Lo 等原文，见表后。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 22.1 节“在交回时学习技能后果”“平均奖励规划中的GVF” | 从 $A$ 到 $C$ 的一趟执行在第 40,003 个原始步结束，$G=3$、$\tau_o=7$、$Y=C$；该步的奖励、时间、停在 $C$ 三个累积量为 3、1、1 | 本课的模拟：三站持续任务，滑动概率 $.1$，第 60,000 步改变 $C$ 的到站奖励；无规划、规划、冻结三组各 120,000 个原始步，不重置，独立重复 8 次；记录取种子 0 规划组第 40,000 步以后第一次以 $C$ 为目标的完成调用 | [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) | [assets/crl-joint-v12/one-real-transition.json](../assets/crl-joint-v12/one-real-transition.json)；[assets/crl-joint-v12/manifest.json](../assets/crl-joint-v12/manifest.json) |
| 22.2 节“平均奖励技能模型规划”“时长预测误差与动作间隔” | $t=244$ 时 $C$ 的到站奖励由 3 降为 $.1$，$t=250$ 与 $t=260$ 两次观察后模型改写；学得奖励率由 $1/3$ 变为 $.2$；$t=266$ 在 $A$ 改选 $B$，换回变化前模型则仍选 $C$；前 600 步更新组 148、冻结组 112.4；读出前后的分数柱图与时长误差图 | 本课的确定性模拟（种子 1429）：同一套预训练技能（每个目的站 2,400 个可重置回合，共 33,965 个原始步）；部署后两组共走 28 步覆盖路线，此后一组在交回时更新模型（TD 步长 $.1$，奖励率步长 $.01$），另一组读第 28 步的模型；规划枚举 8 个高层策略；计分到第 600 步 | [demos/sample14_average_option.py](../demos/sample14_average_option.py) | [assets/sample14-avg-option/sample14-manifest.json](../assets/sample14-avg-option/sample14-manifest.json)；[assets/sample14-avg-option/sample14-option-events.csv](../assets/sample14-avg-option/sample14-option-events.csv)；[assets/sample14-avg-option/sample14-option-decisions.csv](../assets/sample14-avg-option/sample14-option-decisions.csv)；[assets/sample14-avg-option/sample14-option-model-updates.json](../assets/sample14-avg-option/sample14-option-model-updates.json)；[assets/sample14-avg-option/sample14-option-trajectory.csv](../assets/sample14-avg-option/sample14-option-trajectory.csv)；[assets/sample14-avg-option/sample14-option-frozen-trajectory.csv](../assets/sample14-avg-option/sample14-option-frozen-trajectory.csv)；图 [sample14-option-reader.png](../assets/sample14-avg-option/sample14-option-reader.png)、[sample14-option-behavior.png](../assets/sample14-avg-option/sample14-option-behavior.png)、[sample14-option-duration-error.png](../assets/sample14-avg-option/sample14-option-duration-error.png) |
| 22.7 节“访问结构与特征方向子任务”及延伸“双房间中的估计误差、方向奖励与终止动作” | 41 个状态上样本后继表示的学习曲线，20 万次转移后相对误差 $.0380$；由第二大实特征向量给出的内部奖励、动作与终止轨迹（12 步后停止） | 本课的模拟（种子 141908）：均匀随机原始动作，$\gamma=.9$，逐状态步长 $.8/N(s)^{.55}$；方向子任务 12,000 回合（共 76,433 次转移），$\gamma_o=.95$，$\alpha=.2$，$\varepsilon=.2$，含立即停止动作 | [demos/crl_v8_mechanisms.py](../demos/crl_v8_mechanisms.py) | [assets/crl-v8/sr-learning.csv](../assets/crl-v8/sr-learning.csv)；[assets/crl-v8/eigenoption-map.csv](../assets/crl-v8/eigenoption-map.csv)；[assets/crl-v8/eigenoption-trajectory.csv](../assets/crl-v8/eigenoption-trajectory.csv)；[assets/crl-v8/manifest.json](../assets/crl-v8/manifest.json)；图 [sr-learning.png](../assets/crl-v8/sr-learning.png)、[eigenoption.png](../assets/crl-v8/eigenoption.png) |
| 22.8 节“练之前，用模型排队”“练了，规划却没改选”（课件 ch15-f06-discovery、ch22-plan-no-reselect） | 均匀试练、按分排序、只用原始动作的每步主奖励 $.8926/.9774/.9987$；排序减均匀 $+.08479\,[.07007,.09951]$，排序减只用原始动作 $-.02133\,[-.03671,-.00595]$，允许减禁止调用 $+.00332\,[.00217,.00446]$，探索率对齐后 $-.00010\,[-.00040,.00021]$；每个 lifetime 调用约 204 次、约 36 次内部动作不同、约 55% 的优势在窗口内；种子 0 第 388 步分数 $2.825$ 对 $1.437$ | 本课的模拟：与第 21 章“技能的去留”同一实验（五条支路，到站奖励 $1,2,3,4,6$ 的随机排列，差分 Q 学习步长 $.15$、探索率 $.1$，256 步共同探索，16 个 128 步试练窗口），每条 lifetime 8192 步，配对 lifetime 独立重复 64 次，95% 配对 $t$ 区间 | [demos/crl_skill_discovery_trial.py](../demos/crl_skill_discovery_trial.py) | [assets/crl-skill-discovery-trial/runs.csv](../assets/crl-skill-discovery-trial/runs.csv)；[assets/crl-skill-discovery-trial/summary.json](../assets/crl-skill-discovery-trial/summary.json)；[assets/crl-skill-discovery-trial/curves.csv](../assets/crl-skill-discovery-trial/curves.csv)；[assets/crl-skill-discovery-trial/seed-0-events.json](../assets/crl-skill-discovery-trial/seed-0-events.json)；[assets/crl-skill-discovery-trial/discovery-comparison.png](../assets/crl-skill-discovery-trial/discovery-comparison.png) |
| 22.2 节（课件 ch22-lit-wan-fourrooms） | 每 $10^4$ 步的每步奖励曲线（A、H、A∪H）；首个 $10^4$ 步 .0064/.0489/.0456；贪心 .0625/.0505/.0555，达最优 30/30、0/30、8/30 | 本课的模拟：104 格四房间、确定性，到 G 得 $+1$ 后回起点、不复位；inter-option Differential Q-learning 简化写法，$\varepsilon=.1$，$\alpha=2^{-3}$，$\eta=.1$；30 次独立运行，各 $2\times10^5$ 步 | [demos/ch22_lit_wan_fourrooms.py](../demos/ch22_lit_wan_fourrooms.py) | [assets/ch22-lit-wan-fourrooms/results.json](../assets/ch22-lit-wan-fourrooms/results.json) |
| 22.6 节（课件 ch22-lit-blocking） | Dyna-Q 与 Dyna-Q+ 累计奖励曲线；第 1000/3000 步 45.4/75.8 与 69.9/165.6，改路后所得 30.4 与 95.7；8 组参数扫描 | 本课的模拟：6×9 堵路迷宫，第 1000 步改路（10 步变 16 步）；$\gamma=.95$，$\alpha=1$，$\varepsilon=.1$，每步规划 50 次，$\kappa=10^{-3}$；30 次独立运行，3000 步；扫描规划 10/50、步长 .5/1、$\kappa$ $10^{-4}$/$10^{-3}$，各 30 次 | [demos/ch22_lit_blocking.py](../demos/ch22_lit_blocking.py) | [assets/ch22-lit-blocking/results.json](../assets/ch22-lit-blocking/results.json) |
| 22.8 节（课件 ch22-lit-rrs） | 起点估值到位轮数 18/16/10；两项技能从起点的步数、灰格数与价值（−2.093、.843） | 本课的计算：61 格两房间、确定性，灰区每进一格 $-1$，目标 $+1$，$\gamma=.99$；停在走廊奖金 1；精确模型同步值迭代，无随机误差 | [demos/ch22_lit_rrs.py](../demos/ch22_lit_rrs.py) | [assets/ch22-lit-rrs/results.json](../assets/ch22-lit-rrs/results.json) |
| 22.8 节（课件 `ch22-ladder`） | 规律常换时选项规划胜过原始动作规划；交互项为同种子上两种规划增益之差；初步结果 | 本课的模拟：四区仓库，200 万步，60 个种子，差分 Q，SMDP 备份；四个 $h$ 各检验一次，未做多重比较校正 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch22` | [assets/crl-ladder-world/runs/formal-ch22.json](../assets/crl-ladder-world/runs/formal-ch22.json)、[assets/crl-ladder-world/fig/ladder-ch22.png](../assets/crl-ladder-world/fig/ladder-ch22.png) |

运行：
```sh
python3 demos/crl_joint_v12.py                     # 8 个种子 × 3 组 × 120,000 步，写 assets/crl-joint-v12
python3 demos/sample14_average_option.py           # 写 assets/sample14-avg-option
python3 demos/crl_v8_mechanisms.py --figures       # 写 assets/crl-v8
python3 demos/crl_skill_discovery_trial.py         # 写 assets/crl-skill-discovery-trial
python3 demos/ch22_lit_wan_fourrooms.py    # 文献原型：持续四房间，写 assets/ch22-lit-wan-fourrooms
python3 demos/ch22_lit_blocking.py         # 文献原型：堵路迷宫，写 assets/ch22-lit-blocking
python3 demos/ch22_lit_rrs.py              # 文献原型：尊重奖励的子任务，写 assets/ch22-lit-rrs
python3 demos/crl_ladder_learners.py --exp ch22 --seeds 60 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch22.json
python3 demos/crl_ladder_figures.py ch22           # 写 assets/crl-ladder-world/fig/ladder-ch22.png
```

22.7 节“子目标模型与原始动作估值”的四面板图 `assets/crl-formal-maps/gsp-action-values.png` 按正文取自 Lo 等原文的四房间实验，项目中没有生成它的程序，未列入表中。

## 第 23 章　元学习与可塑性 {#ch-23}

本章来自本课程序的结果有：23.1、23.2 节两张按公式绘制的图，23.6 节探索分布的两图与特征替换的小例，23.7 节三组配对实验，IDBD 原始实验的复现，23.2 节“四千个输入，一个有用”的步长对照，23.2 节四区仓库上打滑率漂移的阶梯实验，23.4 节“三类自欺”的外层准则对照，以及本章小结“看多远”中评价窗口与最好步长的关系。最后一项按均值与方差递推精确计算，不抽样。

23.1 节延伸中单次元导数的 $-.16$ 与 $.24$、23.4 节“遗忘再重学”的小例、23.6 节学习曲线的 $1,2,2.5$ 与 $2.25$、$1.27$，以及休眠比例 $.5$、有效秩 $4$ 与 $1$ 的算例，由正文推导直接算出。23.5 节 DiscoRL 的实现是原作者的代码，23.6 节持续反向传播的原图引自原文，出处见表后。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 23.1 节延伸“单次元导数的方向取决于后续目标” | 图 23.1：下一步损失随本次步长变化，后续目标为 $1$ 与 $-1$ 时元梯度方向相反 | 按公式计算：$w_t=0$、$y_t=1$，下一目标取 $1$ 或 $-1$，横轴为步长；无随机重复 | [demos/continual_v6_calculations.py](../demos/continual_v6_calculations.py) | [assets/continual/v6/manifest.json](../assets/continual/v6/manifest.json)；图 [meta-step-loss.png](../assets/continual/v6/meta-step-loss.png)、[meta-step-loss.svg](../assets/continual/v6/meta-step-loss.svg) |
| 23.2 节“资格迹与步长敏感度” | 图 23.2：两次更新后的参数与对数步长敏感度（$\alpha=.8$ 时 $w_2=.16$、$s_2^{\eta}=-.48$） | 按公式计算：一个特征，两趟目标依次为 $1$ 与 $0$；敏感度递推另与有限差分对照；无随机重复 | [demos/crl_v10_derivations.py](../demos/crl_v10_derivations.py) | [assets/crl-v10/results.json](../assets/crl-v10/results.json)（`meta_sensitivity_vs_finite_difference`）；图 [trace-and-sensitivity.png](../assets/crl-v10/trace-and-sensitivity.png) |
| 23.6 节“探索分布、更新尺度与适应速度” | 缩小高斯策略标准差时，超过阈值的动作概率变小、得分函数对均值参数的二阶矩变大（两图） | 按公式计算：一元高斯策略，改变标准差；无随机重复 | [assets/crl-formal-maps/exploration-score.py](../assets/crl-formal-maps/exploration-score.py) | 图 [exploration-score.svg](../assets/crl-formal-maps/exploration-score.svg)、[exploration-score.pdf](../assets/crl-formal-maps/exploration-score.pdf) |
| 23.6 节延伸“学习可塑性” | 替换一个失活特征后，输出连接先学习、输入连接随后恢复，预测超过 $.99$ | 本课的确定性计算：两个无偏置的 ReLU 特征，输入权重初值均为 $-1$（失活），输入与目标均为 $1$，SGD 步长 $.1$，共 60 次更新；第 10 次更新时把一个特征的输入权重换成 $.5$、输出权重置零，另一组不替换作对照；无随机重复 | [demos/crl_v8_mechanisms.py](../demos/crl_v8_mechanisms.py)（`renewal`） | [assets/crl-v8/feature-renewal.csv](../assets/crl-v8/feature-renewal.csv)；[assets/crl-v8/checks.json](../assets/crl-v8/checks.json)；[assets/crl-v8/manifest.json](../assets/crl-v8/manifest.json)；图 [feature-renewal.png](../assets/crl-v8/feature-renewal.png) |
| 第 23 章补充阅读“规划使用哪一个预测问题”（24.6 节“局部学习与全程收益的实验对照”表第一行引用） | 按探测上的奖励预测误差选通道：正确通道占比由均匀选择的 $32.9\%$ 升至 $90.2\%$，每原始步收益增 $.0746$，配对标准误 $.0027$；规划改读无条件平均值时两组收益逐对相同 | 本课的模拟：三个给定预测通道，每次运行 2,048 个原始步，探测概率 $.15$，每 16 次探测复核一次所选通道；配对运行独立重复 96 次 | [demos/crl_question_selection.py](../demos/crl_question_selection.py) | [assets/crl-question-selection/paired.csv](../assets/crl-question-selection/paired.csv)；[assets/crl-question-selection/summary.json](../assets/crl-question-selection/summary.json) |
| 第 23 章补充阅读“子目标选择、技能调用与练习成本” | 每步收益：均匀 $.8926$、排序 $.9774$、只用原始动作 $.9987$；排序减均匀 $+.08479\,[.07007,.09951]$，约 $55\%$ 来自试练窗口（窗口内 $1718.28$ 对 $1337.80$）；种子 0 的逐次事件（第 256、384、388 步，$2.8251$、$1.4374$）；图“发现与练习的对照” | 本课的模拟：五个候选目标；前 256 步共同随机探索，此后共 16 次试练机会，每次至多 64 步练习、64 步估计；每条 lifetime 8,192 步，配对 lifetime 独立重复 64 次，95% 配对 $t$ 区间 | [demos/crl_skill_discovery_trial.py](../demos/crl_skill_discovery_trial.py) | [assets/crl-skill-discovery-trial/runs.csv](../assets/crl-skill-discovery-trial/runs.csv)；[assets/crl-skill-discovery-trial/curves.csv](../assets/crl-skill-discovery-trial/curves.csv)；[assets/crl-skill-discovery-trial/seed-0-events.json](../assets/crl-skill-discovery-trial/seed-0-events.json)；[assets/crl-skill-discovery-trial/summary.json](../assets/crl-skill-discovery-trial/summary.json)；[assets/crl-skill-discovery-trial/protocol.md](../assets/crl-skill-discovery-trial/protocol.md)；[assets/crl-skill-discovery-trial/README.md](../assets/crl-skill-discovery-trial/README.md)；图 [discovery-comparison.png](../assets/crl-skill-discovery-trial/discovery-comparison.png) |
| 第 23 章补充阅读“元步长、时长模型与闭环控制” | 自适应减固定步长：每千步奖励差，平稳世界 $-.299\,[-.787,.057]$，支路变慢 $-.662\,[-1.274,-.123]$；时长均方根误差差 $-.0070$、$-.0446$；规划读逐步 TD 估计时 21/64 与 64/64 个种子出现不同选择；第 1,270 步的估计差由 $-.00334$ 变为 $+.00516$ 等逐步核算；图 A、B | 本课的模拟：三站任务（同 24 章），时长 GVF 初始步长 $.08$，元步长率 $.03$，Huber 阈值 $4$，每块 64 步；规划读完成行程估计或逐步 TD 估计，分平稳与支路变慢两种世界；每条 lifetime 24,000 步，种子起点 140000，配对 lifetime 独立重复 64 次，95% 配对区间 | [demos/crl_meta_reader_trial.py](../demos/crl_meta_reader_trial.py)（调用 [demos/crl_joint_v12.py](../demos/crl_joint_v12.py)） | [assets/crl-meta-reader-trial/results.json](../assets/crl-meta-reader-trial/results.json)；[assets/crl-meta-reader-trial/runs.csv](../assets/crl-meta-reader-trial/runs.csv)；[assets/crl-meta-reader-trial/curves.csv](../assets/crl-meta-reader-trial/curves.csv)；[assets/crl-meta-reader-trial/first-divergences.csv](../assets/crl-meta-reader-trial/first-divergences.csv)；[assets/crl-meta-reader-trial/README.md](../assets/crl-meta-reader-trial/README.md)；图 [meta-reader-effects.png](../assets/crl-meta-reader-trial/meta-reader-effects.png) |
| 23.2 节“IDBD 的原始实验”（课件 ch23-lit-idbd） | 最好 LMS $3.37$（$\alpha=.03$）、IDBD $1.62$（$\theta=.005$）；$\theta=.001$ 学 25 万样本后相关输入步长 $.131\pm.006$、无关约 $.0076$；固定步长扫描最低点在 $.13$ 与 $.14$ 之间；与 Sutton（1992）图 3–5 并列，$\theta$ 小时误差高于论文 | 本课重跑：20 个标准正态输入，5 个相关、系数 $\pm1$，每 20 个样本翻转一个符号；先学 2 万再在其后 1 万样本上算 MSE，IDBD 初始步长 $.05$；固定步长扫描只施加在相关输入上；每档 100 次独立运行 | [demos/ch23_lit_idbd.py](../demos/ch23_lit_idbd.py) | [assets/ch23-lit-idbd/results.json](../assets/ch23-lit-idbd/results.json) |
| 23.2 节“四千个输入，一个有用”（课件 `ch23-stepsize-experiment`） | 后半段超额均方误差，四档中最好：写定步长 $1.04$（$\alpha=3\times10^{-5}$）、Adam $1.01$（$\bar\alpha=3\times10^{-6}$）、IDBD $.064$（元步长 $.03$）；IDBD 末步给 $x_1$ 的步长约 $.185$，其余中位约 $.00024$ | 本课的模拟：$4096$ 个标准正态输入，目标为 $\pm x_1$ 加标准差 $.1$ 的噪声，符号每 $1000$ 步翻转；每档 $10$ 次独立运行，每次 $2$ 万步。元步长 $.1$ 时有运行发散，该档输出 nan；运行中 numpy 会打出溢出类 RuntimeWarning。页上曲线图另行绘制，本程序只打印数表 | [demos/ch23_stepsize_onefeature.py](../demos/ch23_stepsize_onefeature.py) | 只打印到终端；约 1 分钟 |
| 23.4 节“三类自欺”（课件 `ch23-outer-darkroom`） | 每步外部回报：外部回报 $.925$、意外最小 $.026$、意外最大 $.054$、学习进度 $.041$、外部回报加 $.5$ 倍学习进度绝对值 $.918$，以及各准则的去处占比；另打印去掉闪烁屏后的同一张表 | 本课的模拟：四个去处，预测步长 $.5$，选择器按 $\varepsilon=.1$ 贪心、估值步长 $.1$；每个准则 $30$ 次独立运行，各 $5000$ 步。页上条形图另行绘制，本程序只打印数表 | [demos/ch23_outer_criterion.py](../demos/ch23_outer_criterion.py) | 只打印到终端；约 10 秒 |
| 23.2 节（课件 `ch23-ladder`） | 写定步长 .1 已近最好；IDBD 从 .1 起步比写定 .1 高 .0007，每次打滑率变化后少损失约 43 个单位奖励 | 本课的模拟：四区仓库，200 万步，规律 R0，打滑率每 5 万步重抽，20 个种子；差分 Q，状态含灯 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch23` | [assets/crl-ladder-world/runs/formal-ch23.json](../assets/crl-ladder-world/runs/formal-ch23.json)、[assets/crl-ladder-world/fig/ladder-ch23.png](../assets/crl-ladder-world/fig/ladder-ch23.png) |
| 第 23 章本章小结“看多远”（课件 `ch23-r21-ab2-horizon`） | 评价前 20 趟时最好的步长为 .31，评价整段 lifetime 时为 .07 | 本课的计算：固定步长下按均值与方差递推精确计算，不抽样；第 500 趟后右指示的回报由 1 改为 3 | [demos/ch23_r21_ab2_eval_window.py](../demos/ch23_r21_ab2_eval_window.py) | [assets/ch23-r21/ab2-eval-window.pdf](../assets/ch23-r21/ab2-eval-window.pdf) |

运行：
```sh
python3 demos/continual_v6_calculations.py --figures   # 写 assets/continual/v6
python3 demos/crl_v10_derivations.py                   # 写 assets/crl-v10
python3 demos/crl_v8_mechanisms.py --figures           # 写 assets/crl-v8
python3 demos/crl_question_selection.py                # 96 对 × 2048 步，写 assets/crl-question-selection
python3 demos/crl_skill_discovery_trial.py             # 64 对 × 8192 步，写 assets/crl-skill-discovery-trial
python3 demos/crl_meta_reader_trial.py                 # 64 对 × 24000 步，写 assets/crl-meta-reader-trial
python3 demos/ch23_lit_idbd.py             # 文献原型：IDBD 原始实验，写 assets/ch23-lit-idbd
python3 demos/ch23_stepsize_onefeature.py  # 四千个输入一个有用，10 次独立运行，只打印数表
python3 demos/ch23_outer_criterion.py      # 外层准则对照，每个准则 30 次独立运行，只打印数表
python3 demos/crl_ladder_learners.py --exp ch23 --seeds 20 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch23.json
python3 demos/crl_ladder_figures.py ch23           # 写 assets/crl-ladder-world/fig/ladder-ch23.png
python3 demos/ch23_r21_ab2_eval_window.py   # 写 assets/ch23-r21/ab2-eval-window.pdf
```

外部代码（出处）：23.5 节 DiscoRL 的内层与外层，链接到原作者仓库 google-deepmind/disco_rl 中的 `disco.py`、`meta_train.ipynb`、`eval.ipynb`（Oh 等，Nature 2025）。23.6 节的持续反向传播原图引自 Dohare 等（Nature 2024）。

## 第 24 章　整体智能体架构 {#ch-24}

本章来自本课程序的结果有：24.3 节三站任务第 40,003 步的逐行核算，技能与预测的快照图，冻结技能后的期望时长，A 站改选一行的稳态收益，24.5 节八对 lifetime 的配对比较，以及 24.5 节四区仓库上四种变化同时打开时的阶梯实验与改法。24.6 节“局部学习与全程收益的实验对照”一表引用第 23 章三组配对实验的结果。

24.2 节两步算例、24.4 节交互项的十步算例（$J_{11}=8$、$I_T=8$）、24.3 节步长取 $.20$ 时的 $1.3088$，以及 24.5 节所需对数（$\sigma_\Delta\approx2.12$，约 $12$、$35$、$141$ 对）由正文推导直接算出。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 24.3 节“三站仓库”“原始步与技能步”“交回以后”“到站这一步：逐行执行”（课件 ch24-bridge-three-station、ch15-arch-worked-trajectory、ch15-arch-sampled-branch、ch15-r9-arch-arrival-updates） | 规划组种子 0 第 39,996–40,003 步的一次 A 到 C 执行，$(G,\tau)=(3,7)$，首步原地；到站时低层值 $-1.1743\to-1.1464$，时长预测 $1.3860\to1.3551$，$\delta=.164707$，$\bar R$ $.286371\to.286700$，模型 $R$ $3.005568\to3.005123$、$T$ $7.562349\to7.517361$；第 40,010 步返回 A、得主奖励 $1$；第 100、12,000、120,000 步的去 C 技能图与两项 GVF 图 | 本课的模拟：Y 形网格上三个外部给定的站点，持续运行不重置；$10\%$ 的动作被随机动作替换；低层探索率 $.06$，高层 $.12$；技能步长 $.16$，GVF、模型与站点价值步长 $.08$，率估计步长 $.002$；规划组每个原始步做五次模型备份；表中各数取自规划组种子 0 这一段 lifetime | [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) | [assets/crl-joint-v12/one-real-transition.json](../assets/crl-joint-v12/one-real-transition.json)；[assets/crl-joint-v12/options-planning-seed0.csv](../assets/crl-joint-v12/options-planning-seed0.csv)；[assets/crl-joint-v12/raw-planning-seed0.npz](../assets/crl-joint-v12/raw-planning-seed0.npz)；图 [skill-policy-maps.png](../assets/crl-joint-v12/skill-policy-maps.png)、[gvf-maps.png](../assets/crl-joint-v12/gvf-maps.png) |
| 24.3 节“每个原始步：行为、奖励预测与时间预测”的事件图 | 同一次执行的七个原始步与 $G$、$\tau$ 的逐步累积；另对上一行的技能、GVF、$\delta$ 与模型更新逐项复算 | 不重新训练：读取上一行保存的轨迹与到站记录，逐项复算并作图 | [demos/v18_systems.py](../demos/v18_systems.py) | 读 [assets/crl-joint-v12/raw-planning-seed0.npz](../assets/crl-joint-v12/raw-planning-seed0.npz)、[one-real-transition.json](../assets/crl-joint-v12/one-real-transition.json)；写 [assets/v18-systems/checks.json](../assets/v18-systems/checks.json)；图 [joint-event-timeline.png](../assets/v18-systems/joint-event-timeline.png) |
| 24.3 节“表示、技能与更新规则的联合学习” | 冻结规划组第 100 步与第 12,000 步的去 C 技能，从 A 到 C 的期望时长约 $6{,}273$ 步与 $7.09$ 步；各位置选“东”的概率 | 不重新训练：读取规划组种子 0 的两个参数快照，保留探索与动作噪声，解七个位置的吸收链方程，另以生存概率求和验算 | [demos/v19_continual.py](../demos/v19_continual.py) | 读 [assets/crl-joint-v12/raw-planning-seed0.npz](../assets/crl-joint-v12/raw-planning-seed0.npz)；写 [assets/v19-continual/skill-changes-prediction-target.csv](../assets/v19-continual/skill-changes-prediction-target.csv)、[assets/v19-continual/checks.json](../assets/v19-continual/checks.json)（`skill_duration`）；图 [skill-changes-target.png](../assets/v19-continual/skill-changes-target.png) |
| 24.3 节“A 站改选一行：频率要按新策略取”“全程平均主奖励”（课件 ch24-occupancy-advantage、ch24-tw） | A 站平均优势 $.045047$ 乘 A 站每步决策频率 $.060446$，得 $.002723$（每千步 $2.72$）；36 个可达状态上稳态每步收益 $.0764982\to.0792211$，差 $.0027229$；路口且上次服务 B 的占比 $.01631\to.07442$ | 无训练：取不规划组种子 0 第 60,000 步（C 降奖后）的参数快照为固定策略 $\mu$，只改 A 站一行得 $\mu'$，对两者解稳态分布 | [demos/station_occupancy.py](../demos/station_occupancy.py) | 读 [assets/crl-joint-v12/raw-no_planning-seed0.npz](../assets/crl-joint-v12/raw-no_planning-seed0.npz)；结果只打印到终端，不写文件 |
| 24.5 节“三站实验：八对 lifetime 的配对差”（课件 ch24-three-station-lifetimes、ch24-open-difficulty） | 全程每步收益：不规划 $.208758$、规划 $.207046$、冻结 $.167127$；变化后最后 18,000 步 $.149318$、$.149327$、$.065790$；八对配对差（每千步）$.604,\ -.406,\ -5.093,\ -2.354,\ .259,\ -3.928,\ -2.695,\ -.088$，均值 $-1.713$，标准误 $.748$，$t_7$ 区间 $[-3.481,+.056]$；规划组共 $984{,}860$ 次模型备份（种子 0 为 $119{,}410$ 次，完成 $23{,}882$ 项技能）；学习曲线与到站序列两图 | 本课的模拟：设置同第一行，三种条件（不规划、规划、冻结）；第 60,000 步后 C 站奖励由 $3$ 降为 $.1$，两组都不重置；每段 lifetime 120,000 个原始步，种子 0–7，配对 lifetime 独立重复 8 次。配对差、均值、标准误与 $t$ 区间由 `manifest.json` 中各种子的 `lifetime_rate` 逐对相减算出，程序未单独写出。课件 ch24-pairs-needed 讲稿的 16 对：`python3 demos/crl_joint_v12.py --seeds 16 --output-dir <新目录>`（约 1 分钟），按 `resources.csv` 中规划与不规划两组逐对相减（每千步），均值 $-.688$，$t_{15}$ 区间 $[-1.708,+.331]$ | [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) | [assets/crl-joint-v12/manifest.json](../assets/crl-joint-v12/manifest.json)（`summary`）；[assets/crl-joint-v12/resources.csv](../assets/crl-joint-v12/resources.csv)；[assets/crl-joint-v12/learning-curves.csv](../assets/crl-joint-v12/learning-curves.csv)；[assets/crl-joint-v12/README.md](../assets/crl-joint-v12/README.md)；图 [learning-curves.png](../assets/crl-joint-v12/learning-curves.png)、[behavior-routes.png](../assets/crl-joint-v12/behavior-routes.png) |
| 24.6 节“局部学习与全程收益的实验对照” | 三行分别引用：通道选择每步 $+.0746$（标准误 $.0027$）；排序练习比均匀多 $.08479$、比只用原始动作少 $.02133$；规划读逐步时长 GVF 且支路变慢时每千步 $-.662\,[-1.274,-.123]$ | 设置见第 23 章表中 23.7 节三行；96、64、64 对配对运行 | [demos/crl_question_selection.py](../demos/crl_question_selection.py)；[demos/crl_skill_discovery_trial.py](../demos/crl_skill_discovery_trial.py)；[demos/crl_meta_reader_trial.py](../demos/crl_meta_reader_trial.py) | [assets/crl-question-selection/summary.json](../assets/crl-question-selection/summary.json)；[assets/crl-skill-discovery-trial/summary.json](../assets/crl-skill-discovery-trial/summary.json)；[assets/crl-meta-reader-trial/results.json](../assets/crl-meta-reader-trial/results.json) |
| 24.5 节（课件 `ch24-ladder`） | 四个部件单加只有电量有益，lifetime 到天花板的 54%（最后一成 64%）；全加切换 8600 多次；改法把切换降到 2600 多次，lifetime 高 .0111（最后一成高 .0163） | 本课的模拟：四区仓库，四个刻度同时打开，200 万步，20 个种子，差分 Q；真实规律切换约 2000 次 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch24`；[demos/crl_ladder_diagnostics.py](../demos/crl_ladder_diagnostics.py) | [assets/crl-ladder-world/runs/formal-ch24.json](../assets/crl-ladder-world/runs/formal-ch24.json)、[assets/crl-ladder-world/fig/ladder-ch24.png](../assets/crl-ladder-world/fig/ladder-ch24.png)；runs/ 下的 diag-ch24_*.json |

运行：
```sh
python3 demos/crl_joint_v12.py --output-dir runs/crl-joint   # 8 种子 × 3 条件 × 120000 步；不加 --output-dir 时写 assets/crl-joint-v12
python3 demos/v18_systems.py                                  # 读 assets/crl-joint-v12，写 assets/v18-systems
python3 demos/v19_continual.py                                # 读 assets/crl-joint-v12，写 assets/v19-continual
python3 demos/station_occupancy.py                            # 读不规划组种子 0 的轨迹，只打印
python3 demos/crl_ladder_learners.py --exp ch24 --seeds 20 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch24.json
python3 demos/crl_ladder_figures.py ch24           # 写 assets/crl-ladder-world/fig/ladder-ch24.png
```

## 第 25 章　知识的维护、检验与更新 {#ch-25}

本章 25.2 节三站仓库的数字（100 次试走 90 次成功、半宽 $h_{100}=.254$、区间 $[.646,1]$ 与“去 C”的 $[.523,.7]$、至少 $68$ 次）由正文推导直接算出。来自本课程序的结果有捷径迷宫的文献原型，以及 25.2 节四区仓库上北门关闭再重开时探测方式的阶梯比较。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 25.2 节“捷径迷宫”（课件 `ch25-lit-shortcut`） | 后 3000 步 Dyna-Q 165.33、Dyna-Q+ 228.77 次到达终点；Dyna-Q+ 30 次全部走通捷径，首次走通延迟中位数 354 步；Dyna-Q 1 次偶然走通 | 本课的模拟：6×9 捷径迷宫，第 3000 步后打开缺口，共 6000 个真实步，每个真实步 50 次规划，$\alpha=1$，$\gamma=.95$，$\epsilon=.1$，$\kappa=.001$，独立重复 30 次 | [demos/ch25_lit_shortcut.py](../demos/ch25_lit_shortcut.py) | [assets/ch25-lit-shortcut/results.json](../assets/ch25-lit-shortcut/results.json) |
| 25.2 节（课件 `ch25-ladder`） | 北门关 50 万步后重开：不探测的 Dyna 重开后每步少拿约 .008，学变化率的探测降到 .002；学变化率减不探测 $+.0031\pm.0005$，减 Dyna-Q+ $+.0020\pm.0007$ | 本课的模拟：四区仓库，200 万步，差分 Q，60 个种子；对照组同种子、门一直开 | [demos/crl_ladder_learners.py](../demos/crl_ladder_learners.py) 实验 `ch25` | [assets/crl-ladder-world/runs/formal-ch25.json](../assets/crl-ladder-world/runs/formal-ch25.json)、[assets/crl-ladder-world/fig/ladder-ch25.png](../assets/crl-ladder-world/fig/ladder-ch25.png) |
| 25.2 节“每试一次就看一次”（课件 `ch25-anytime`） | 试走 $1000$ 次以内至少一次漏掉 $\mu$ 的比例：正态区间 $.514$、固定样本 Hoeffding 区间 $.091$、随时有效区间 $.0001$；下界越过 $.6$ 而误换的比例 $.255$、$.038$、$0$；$m=100$ 时半宽 $.096$、$.136$、$.254$；样本均值 $.9$ 时分开 $.6$ 分别需 $4$、$21$、$68$ 次 | 本课的模拟：$\mu=.6$，$p_{\mathrm f}=.05$，$20000$ 次独立运行，每次试走 $1000$ 次、每次都看区间；种子 $20261118$ | [demos/ch25_anytime_intervals.py](../demos/ch25_anytime_intervals.py) | [assets/ch25-anytime/results.json](../assets/ch25-anytime/results.json) |
| 25.6 节“挑出来的，再量会偏高”（课件 `ch25-check-exp`） | 偏差／均方根误差：外部评价 $.00/.20$，独立评价 $.00/1.00$，同源（$\rho=.5$）$.66/1.16$，自评 $1.32/1.54$；拿独立评价者自己来挑时偏差 $1.32$；被挑中者真实效用 $1.32$，真实最优平均 $1.87$，自评报告 $2.64$ | 本课的模拟：$20$ 个候选，真实效用与提出者误差都取标准正态，挑估计最大者；$200000$ 次运行，种子 $20261118$ | [demos/ch25_selection_bias.py](../demos/ch25_selection_bias.py) | [assets/ch25-check-exp/results.json](../assets/ch25-check-exp/results.json) |

运行：
```sh
python3 demos/ch25_lit_shortcut.py         # 文献原型：捷径迷宫，写 assets/ch25-lit-shortcut
python3 demos/crl_ladder_learners.py --exp ch25 --seeds 60 --seed0 100 --steps 2000000 --tag formal   # 四区仓库阶梯，写 assets/crl-ladder-world/runs/formal-ch25.json
python3 demos/crl_ladder_figures.py ch25           # 写 assets/crl-ladder-world/fig/ladder-ch25.png
python3 demos/ch25_anytime_intervals.py    # 随时有效区间，写 assets/ch25-anytime/results.json，约 1 秒
python3 demos/ch25_selection_bias.py       # 挑选偏差，写 assets/ch25-check-exp/results.json，约 1 秒
```

## 第 26 章　持续强化学习的基准设计与 lifetime 评价 {#ch-26}

本章来自本课程序的结果有：26.5 节引用的第 24 章三站实验配对差，26.6 节锁协议、Rule 110 见证与在轨装配两次加力的数值，选读部分“一项能力的收支”的模拟与否定对照，以及各研究世界表中已运行的数字。选读部分指 26.md 的“研究环境：能力怎样从经验中形成（选读）”；这几个程序放在 research/ 目录下，表中的链接给出位置。平流层气球与聚变一段引用的代码和测量来自原作者，出处见表后。

26.4 节仓库读数的 $27/8$、$17/8$、$5/8$ 与 $4/3$，以及 $N\approx(2.8\sigma_\Delta/\delta)^2$ 代入后的配对数，由正文推导直接算出。

26.1 节与 26.5 节仓库上的配对数字，对全部 $256$ 种指示串精确求和；单细胞的参考线与负对照由模拟得到。两者的程序见表中前两行。

| 位置 | 结果 | 设置 | 程序 | 数据与输出 |
|---|---|---|---|---|
| 26.1 节“仓库上的一段配对 lifetime”“配对差的期望、方差与重放的失效”（课件 `ch26-warehouse-pair`、`ch26-replay-fails`）；26.5 节仓库各表 | 例子指示串上 $L$ 得 $22$、$L_0$ 得 $15$，$14$ 步时差 $-4$；每步奖励期望 $.926$ 对 $.637$，配对差 $+.288$（精确值 $1771/6144$）；方差 $.0010$、$.0496$，协方差 $-.0021$；配对标准差 $.234$，不配对 $.225$；$N(.1)=43$，$\delta_N(6)=.268$；负对照：只读不写 $0$（标准差 $.249$），打乱奖励 $+.017$（$.209$）；随机转向 $.637$ | 本课的计算：$T=24$，照指示 $3$ 步、奖励 $4$，不照指示 $5$ 步、奖励 $1$；对 $2^8$ 种指示串（打乱奖励与随机转向再乘 $2^8$ 种）精确求和 | [demos/ch26_warehouse_pairs.py](../demos/ch26_warehouse_pairs.py) | 结果打印到终端，无输出文件 |
| 26.5 节“负对照”“四条参考线”中的单细胞（课件 `ch26-spec-controls`、`ch26-spec-lines`） | 全程匹配率：保留记忆 $.848$，总按线索 $.500$，知道配对 $.850$；增益 $+.348$，单段标准差 $.008$；打乱奖励 $+.0006$（$.019$）；反转后 $16$ 轮答对：保留记忆均值 $9.4$（最少 $3$，最多 $14$）；恢复到七成五平均 $20.3$ 轮，中位数 $19$ 轮 | 本课的模拟：$1000$ 段 lifetime，每段 $4000$ 轮，第 $2001$ 轮起配对反转，线索可靠度 $.85$，记忆 $m\leftarrow.875m+.125\,cy$；种子 $1$。总按线索与上限的 $2.4$、$13.6$ 是精确期望 | [demos/ch26_single_cell.py](../demos/ch26_single_cell.py) | 结果打印到终端，无输出文件 |
| 26.5 节“要多少对”表中“第 24 章三站实验”一行（课件 `ch26-spec-pairs`） | 八对每千步差均值 $-1.71$，标准误 $.748$，单对标准差约 $2.12$ | 本课的模拟：三站任务，不规划、五次规划、中点后冻结三种条件各运行 8 段 lifetime，每段 $120000$ 步，第 $60000$ 步 C 站奖励由 $3$ 降为 $.1$；此处按种子把不规划组与五次规划组配成 8 对，取全程每步奖励之差 | [demos/crl_joint_v12.py](../demos/crl_joint_v12.py) | [assets/crl-joint-v12/manifest.json](../assets/crl-joint-v12/manifest.json)（`summary` 中逐种子的 `lifetime_rate`）；逐段原始记录在同一目录的 `raw-*-seed*.npz` |
| 26.6 节“第一个标志性基准”，两类任务（课件 ch26-computer-tasks） | 锁协议共 $18$ 个赋值；查锁与上锁分两步时最短 $4$ 步违反互斥；合成一步时不变式 $H$ 含 $8$ 个状态，通过三条蕴含核验；把错误的证书交给核验器时被拒绝 | 本课的计算：两进程、每进程闲/看/临界三相加一位锁；由广度优先搜索求最短反例，由独立的核验函数检查证书 | [research/benchmark-series/protocol-validator.py](../research/benchmark-series/protocol-validator.py) | 结果打印到终端，无输出文件；`--emit` 输出 JSON 证书，`--check` 读入并核验 |
| 26.6 节“第一个标志性基准”，校准见证（课件 ch26-computer-witness） | 输入写在第 $-13$ 与 $+9$ 格，跑 $24$ 拍，中心读数 $0,1,1,0$；第 $23$ 拍早读与改用 Rule 108 时四组都为 $0$；每组 $49\times24=1176$ 次格点更新 | 本课的计算：Rule 110，以太图样 `00010011011111`，$T=24$，四组输入各运行一次 | [research/benchmark-series/rule110-witness.py](../research/benchmark-series/rule110-witness.py) | [research/benchmark-series/local-computation.svg](../research/benchmark-series/local-computation.svg)（加 `--figure` 时生成） |
| 26.6 节“第二个标志性基准：在轨装配”（课件 `ch26-orbit-identify`）；选读部分世界表“在轨装配”一行 | $(b,c)=(.6,.2)$ 与 $(.2,.4)$ 在 $2$ N 时位移都是 $1.0$ mm，在 $4$ N 时为 $1.4$ 与 $1.8$ mm，相差 $.4$ mm | 本课的模拟：单一侧向弹簧—阻尼模态，质量 $.4$ kg，临界阻尼，每个力水平积分 $.25$ s，步长 $1$ ms 与 $.5$ ms 各算一次；与静态解之差小于 $.001$ mm | [research/benchmark-series/orbit-probe.py](../research/benchmark-series/orbit-probe.py) | 结果打印到终端，无输出文件 |
| 选读部分“一项能力的收支与可判别的窗口”；“首批实验的实施方案”第二、三步 | 四种做法的模拟值 $3.951$、$3.998$、$5.314$、$5.614$（标准误不超过 $.028$）；$c^*=.3$ 时最大优势 $2.1$；细胞代入得 $1.2$ 对 $1.0$；三个否定对照下保留优势 $-.1$、$-1.1$、$-2.7$；“整理成知识”比固定方案多 $1.6$，差的标准差约 $5.1$，$N\approx80$ | 本课的模拟：最小世界 $n=8$、$q=.8$、$D=1$、$c=.3$、$C=.5$、$\rho=.1$，独立模拟 $20000$ 条 lifetime，种子 $20261117$；否定对照依次取 $n=1$、$q=.5$、$p_0=1$；细胞代入取 $n=2$、$c=.4$、$C=0$、$\rho=0$；探测价格 $c$ 从 $0$ 取到 $2.6$ | [research/capability-ledger.py](../research/capability-ledger.py) | 结果打印到终端，无输出文件 |
| 选读部分世界表“磁平衡程序”一行；“各世界的可学规律与检验”磁平衡一段 | 三组常数源项的问题通过全域验证，首例 $\psi=-s^2/4+3s/2-Z^2-5/4$；换源项后 $63$ 个非空组合全部失败 | 本课的计算：变换 $s=R^2$，六个候选单项式 $1,s,Z,sZ,s^2,Z^2$，枚举非空组合，在五个边界点和三个内部点上求精确有理系数，再独立检验全域方程与整条边界；需 sympy | [research/benchmark-series/equilibrium-program.py](../research/benchmark-series/equilibrium-program.py) | [research/benchmark-series/equilibrium-program.svg](../research/benchmark-series/equilibrium-program.svg)（加 `--figure` 时生成） |
| 选读部分世界表“单细胞”“虚拟细胞实验室”两行；“各世界的可学规律与检验”中生物个体与虚拟细胞实验室两段 | 受体准确率 $.80$：不测 $.50$，成本 $.10$ 时 $.70$，成本 $.40$ 时 $.40$；先验 $.90$ 时读数价值为零；无区分力的一行重复 $6$ 次 Brier 分数仍为 $.2500$，有区分力的一行 $6$ 次降到 $.0931$ | 本课的计算：二元感知按精确分数求期望；虚拟实验室枚举 $(A,B,\text{培养基})$ 八种环境，读数独立以 $10\%$ 概率翻转，按精确分数计算留出条件上的期望 Brier 分数 | [research/benchmark-series/life-probes.py](../research/benchmark-series/life-probes.py) | [research/benchmark-series/lab-intervention-brier.svg](../research/benchmark-series/lab-intervention-brier.svg)（加 `--figure` 时生成） |
| 选读部分世界表“单细胞”一行；“一种能力何时值得获得”中配送网与细胞两段 | 配送网每拍送对 $5.028$ 件对 $8$ 件；单细胞清除慢状态后匹配率由 $.850$ 降到 $.497$ | 本课的模拟：单次运行，种子 $20261116$，$4000$ 拍；配送网 $N=8$、$k=2$；细胞线索可靠度 $.85$、痕迹更新率 $.125$，从第 $2001$ 拍起配对反转 | [research/experience-worlds.py](../research/experience-worlds.py) | 结果打印到终端，无输出文件 |

运行：
```sh
python3 demos/ch26_warehouse_pairs.py      # 仓库配对差，精确求和，打印，约 1 秒
python3 demos/ch26_single_cell.py          # 单细胞参考线与负对照，打印，约 1 秒
python3 demos/crl_joint_v12.py
python3 research/benchmark-series/protocol-validator.py
python3 research/benchmark-series/rule110-witness.py --figure research/benchmark-series/local-computation.svg
python3 research/benchmark-series/orbit-probe.py
python3 research/capability-ledger.py
python3 research/benchmark-series/equilibrium-program.py --figure research/benchmark-series/equilibrium-program.svg
python3 research/benchmark-series/life-probes.py --figure research/benchmark-series/lab-intervention-brier.svg
python3 research/experience-worlds.py --seed 20261116 --steps 4000
```

外部代码（出处）：平流层气球一段引用 Balloon Learning Environment（google/balloon-learning-environment）的 `eval_lib.py`、`balloon_env.py`、`generative_wind_field.py`、`balloon_arena.py`、`features.py`、`perciatelli44.py`、`station_seeker_agent.py`、`marco_polo_exploration.py`、`wind_gp.py`，为原作者代码；聚变“每炮约 2 分 37 秒”为 FPDT 作者的测量，MHD 求解器的迭代数与求解时间取自 Adams 等的文献。
