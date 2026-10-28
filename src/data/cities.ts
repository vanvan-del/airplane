import { CityGuide, Place } from '../types';

// 内置城市坐标和三字码，没网或者地名解析失败时也能算距离、拼机票链接
const CITY_BASE: Array<[string, string, number, number]> = [
  ['北京', 'BJS', 39.904, 116.407],
  ['上海', 'SHA', 31.23, 121.474],
  ['广州', 'CAN', 23.129, 113.264],
  ['深圳', 'SZX', 22.543, 114.058],
  ['成都', 'CTU', 30.572, 104.066],
  ['重庆', 'CKG', 29.563, 106.551],
  ['西安', 'SIA', 34.341, 108.94],
  ['杭州', 'HGH', 30.274, 120.155],
  ['南京', 'NKG', 32.06, 118.797],
  ['厦门', 'XMN', 24.48, 118.089],
  ['三亚', 'SYX', 18.253, 109.512],
  ['长沙', 'CSX', 28.228, 112.939],
  ['青岛', 'TAO', 36.067, 120.383],
  ['大理', 'DLU', 25.606, 100.268],
  ['武汉', 'WUH', 30.593, 114.305],
  ['昆明', 'KMG', 25.039, 102.718],
  ['天津', 'TSN', 39.084, 117.201],
  ['郑州', 'CGO', 34.746, 113.625],
  ['沈阳', 'SHE', 41.806, 123.432],
  ['大连', 'DLC', 38.914, 121.615],
  ['哈尔滨', 'HRB', 45.803, 126.535],
  ['济南', 'TNA', 36.651, 117.12],
  ['合肥', 'HFE', 31.821, 117.227],
  ['福州', 'FOC', 26.075, 119.296],
  ['南昌', 'KHN', 28.682, 115.858],
  ['南宁', 'NNG', 22.817, 108.366],
  ['贵阳', 'KWE', 26.647, 106.63],
  ['海口', 'HAK', 20.044, 110.199],
  ['兰州', 'LHW', 36.061, 103.834],
  ['乌鲁木齐', 'URC', 43.825, 87.617],
  ['拉萨', 'LXA', 29.652, 91.172],
  ['太原', 'TYN', 37.87, 112.549],
  ['石家庄', 'SJW', 38.042, 114.515],
  ['呼和浩特', 'HET', 40.842, 111.749],
  ['银川', 'INC', 38.487, 106.231],
  ['西宁', 'XNN', 36.617, 101.778],
  ['桂林', 'KWL', 25.274, 110.29],
  ['丽江', 'LJG', 26.855, 100.227],
  ['宁波', 'NGB', 29.868, 121.544],
  ['温州', 'WNZ', 27.994, 120.699],
  ['无锡', 'WUX', 31.491, 120.312],
  ['珠海', 'ZUH', 22.271, 113.577],
  ['苏州', '', 31.299, 120.585],
];

const GUIDES: Record<string, CityGuide> = {
  北京: {
    spots: [
      { name: '故宫博物院', emoji: '🏯', kind: 'sight', ticket: '旺季60元/淡季40元，需提前实名预约', tip: '周一闭馆，建议从午门进、神武门出' },
      { name: '八达岭长城', emoji: '🧱', kind: 'sight', ticket: '约40元', tip: '北京北站有直达动车，避开周末人少很多' },
      { name: '颐和园', emoji: '🌉', kind: 'sight', ticket: '旺季30元/淡季20元，联票更贵', tip: '十七孔桥冬至前后有“金光穿洞”' },
      { name: '天安门广场', emoji: '🇨🇳', kind: 'photo', ticket: '免费，需预约', tip: '看升旗要很早排队，日出时间前到' },
      { name: '景山公园万春亭', emoji: '📸', kind: 'photo', ticket: '约2元', tip: '俯拍故宫全景的最佳机位，傍晚光线最好' },
      { name: '南锣鼓巷 / 什刹海', emoji: '🏮', kind: 'photo', ticket: '免费', tip: '胡同街拍，傍晚在银锭桥看西山落日' },
    ],
    foods: [
      { name: '北京烤鸭', emoji: '🦆', desc: '片皮卷饼，必吃' },
      { name: '铜锅涮肉', emoji: '🍲', desc: '麻酱小料是灵魂' },
      { name: '炸酱面', emoji: '🍜', desc: '老北京家常味' },
      { name: '豆汁儿焦圈', emoji: '🥣', desc: '勇者的挑战' },
      { name: '糖葫芦', emoji: '🍡', desc: '逛胡同顺手来一串' },
    ],
    route: [
      '第1天：天安门广场 → 故宫 → 景山公园看日落 → 王府井吃烤鸭',
      '第2天：八达岭长城（上午）→ 回城 → 南锣鼓巷 → 什刹海夜景',
      '第3天：颐和园 → 圆明园 → 五道口/798 艺术区',
    ],
  },
  上海: {
    spots: [
      { name: '外滩', emoji: '🌃', kind: 'photo', ticket: '免费', tip: '夜景亮灯后最美，对岸就是陆家嘴天际线' },
      { name: '东方明珠', emoji: '🗼', kind: 'sight', ticket: '约199元起（观光票）', tip: '想拍明珠本身，去外滩或滨江拍更好' },
      { name: '豫园 / 城隍庙', emoji: '🏮', kind: 'sight', ticket: '豫园约40元（淡季更低）', tip: '九曲桥、湖心亭，春节灯会很热闹' },
      { name: '武康路 / 武康大楼', emoji: '📸', kind: 'photo', ticket: '免费', tip: '梧桐树+老洋房，秋天落叶季最出片' },
      { name: '上海迪士尼乐园', emoji: '🏰', kind: 'sight', ticket: '约475元起，按日期浮动', tip: '提前下载官方 App 排队，晚上看烟花' },
      { name: '徐汇滨江', emoji: '🚲', kind: 'photo', ticket: '免费', tip: '工业风+江景，适合骑行和日落' },
    ],
    foods: [
      { name: '生煎包', emoji: '🥟', desc: '底脆汁多，小心烫' },
      { name: '小笼包', emoji: '🥢', desc: '城隍庙南翔馒头店' },
      { name: '本帮红烧肉', emoji: '🍖', desc: '浓油赤酱' },
      { name: '葱油拌面', emoji: '🍝', desc: '简单却很香' },
      { name: '蟹粉小笼', emoji: '🦀', desc: '秋天大闸蟹季节限定' },
    ],
    route: [
      '第1天：豫园城隍庙 → 南京路步行街 → 外滩夜景',
      '第2天：武康路 → 安福路 → 新天地 → 徐汇滨江看日落',
      '第3天：迪士尼乐园全天（或陆家嘴 + 东方明珠）',
    ],
  },
  广州: {
    spots: [
      { name: '广州塔（小蛮腰）', emoji: '🗼', kind: 'sight', ticket: '观光票约150元起', tip: '海心沙或花城广场拍塔最好看' },
      { name: '沙面岛', emoji: '📸', kind: 'photo', ticket: '免费', tip: '欧式建筑街区，婚纱照圣地' },
      { name: '陈家祠', emoji: '🏛️', kind: 'sight', ticket: '约10元', tip: '岭南建筑雕刻精品' },
      { name: '永庆坊', emoji: '🏮', kind: 'photo', ticket: '免费', tip: '西关老街，骑楼+粤剧氛围' },
      { name: '长隆野生动物世界', emoji: '🐼', kind: 'sight', ticket: '约300元起，按日期浮动', tip: '带小朋友必去，留一整天' },
    ],
    foods: [
      { name: '早茶点心', emoji: '🫖', desc: '虾饺、烧卖、肠粉' },
      { name: '烧鹅/叉烧', emoji: '🍗', desc: '烧腊饭一绝' },
      { name: '煲仔饭', emoji: '🍚', desc: '锅巴最香' },
      { name: '双皮奶', emoji: '🍮', desc: '顺德甜品' },
      { name: '艇仔粥', emoji: '🥣', desc: '西关风味' },
    ],
    route: [
      '第1天：早茶 → 陈家祠 → 永庆坊 → 上下九步行街',
      '第2天：沙面岛 → 北京路 → 晚上广州塔 + 珠江夜游',
      '第3天：长隆野生动物世界全天',
    ],
  },
  深圳: {
    spots: [
      { name: '深圳湾公园', emoji: '🌅', kind: 'photo', ticket: '免费', tip: '海边骑行看日落，能望到香港' },
      { name: '大梅沙海滨公园', emoji: '🏖️', kind: 'sight', ticket: '免费', tip: '夏天节假日需要预约' },
      { name: '华侨城创意文化园', emoji: '🎨', kind: 'photo', ticket: '免费', tip: '工业风文艺园区' },
      { name: '欢乐港湾摩天轮', emoji: '🎡', kind: 'photo', ticket: '公园免费，摩天轮另收费', tip: '夜景很漂亮' },
      { name: '世界之窗', emoji: '🗽', kind: 'sight', ticket: '以官方为准', tip: '一天“环游世界”' },
    ],
    foods: [
      { name: '潮汕牛肉火锅', emoji: '🥩', desc: '鲜切牛肉现涮' },
      { name: '椰子鸡', emoji: '🥥', desc: '深圳特色清甜锅' },
      { name: '肠粉', emoji: '🍥', desc: '早餐首选' },
      { name: '沙井生蚝', emoji: '🦪', desc: '烤生蚝' },
    ],
    route: [
      '第1天：华侨城创意园 → 世界之窗 → 深圳湾公园日落',
      '第2天：大梅沙 → 东部华侨城 → 欢乐港湾夜景',
    ],
  },
  成都: {
    spots: [
      { name: '大熊猫繁育研究基地', emoji: '🐼', kind: 'sight', ticket: '约55元', tip: '早上7:30开园就去，熊猫最活跃' },
      { name: '宽窄巷子', emoji: '🏮', kind: 'photo', ticket: '免费', tip: '老成都街巷，喝盖碗茶' },
      { name: '锦里 + 武侯祠', emoji: '🏯', kind: 'sight', ticket: '锦里免费，武侯祠约50元', tip: '锦里夜景灯笼很出片' },
      { name: '春熙路 / 太古里', emoji: '📸', kind: 'photo', ticket: '免费', tip: 'IFS 楼顶爬墙熊猫打卡' },
      { name: '都江堰', emoji: '🌊', kind: 'sight', ticket: '约80元', tip: '可与青城山一起安排一天' },
      { name: '杜甫草堂', emoji: '📜', kind: 'sight', ticket: '约50元', tip: '安静的园林' },
    ],
    foods: [
      { name: '火锅', emoji: '🌶️', desc: '牛油红锅配毛肚' },
      { name: '串串香', emoji: '🍢', desc: '按签子算钱' },
      { name: '担担面', emoji: '🍜', desc: '麻辣鲜香' },
      { name: '钟水饺/龙抄手', emoji: '🥟', desc: '老字号小吃' },
      { name: '兔头', emoji: '🐰', desc: '成都人最爱' },
    ],
    route: [
      '第1天：熊猫基地（早）→ 春熙路太古里 → 晚上火锅',
      '第2天：宽窄巷子 → 人民公园喝茶 → 武侯祠 → 锦里夜景',
      '第3天：都江堰 + 青城山一日游',
    ],
  },
  重庆: {
    spots: [
      { name: '洪崖洞', emoji: '🏮', kind: 'photo', ticket: '免费', tip: '千与千寻同款夜景，千厮门大桥上拍最好' },
      { name: '李子坝轻轨穿楼', emoji: '🚝', kind: 'photo', ticket: '免费', tip: '观景平台等列车穿楼' },
      { name: '长江索道', emoji: '🚡', kind: 'sight', ticket: '单程约20元', tip: '排队久，可以傍晚去' },
      { name: '解放碑', emoji: '🗿', kind: 'sight', ticket: '免费', tip: '附近好吃街吃小吃' },
      { name: '磁器口古镇', emoji: '🏘️', kind: 'sight', ticket: '免费', tip: '吃陈麻花，避开节假日' },
      { name: '南山一棵树观景台', emoji: '🌃', kind: 'photo', ticket: '以官方为准', tip: '俯瞰渝中半岛全景夜景' },
    ],
    foods: [
      { name: '重庆火锅', emoji: '🌶️', desc: '九宫格老火锅' },
      { name: '重庆小面', emoji: '🍜', desc: '早餐来一碗' },
      { name: '酸辣粉', emoji: '🥢', desc: '又酸又辣' },
      { name: '烤鱼', emoji: '🐟', desc: '万州烤鱼' },
      { name: '冰粉', emoji: '🍧', desc: '吃完火锅解辣' },
    ],
    route: [
      '第1天：解放碑 → 长江索道 → 洪崖洞夜景',
      '第2天：李子坝轻轨 → 鹅岭二厂 → 磁器口 → 南山一棵树',
    ],
  },
  西安: {
    spots: [
      { name: '秦始皇兵马俑', emoji: '🗿', kind: 'sight', ticket: '约120元，需预约', tip: '请个讲解或租讲解器，信息量很大' },
      { name: '西安城墙', emoji: '🧱', kind: 'sight', ticket: '约54元', tip: '城墙上骑自行车绕一圈' },
      { name: '大唐不夜城', emoji: '🏮', kind: 'photo', ticket: '免费', tip: '晚上去，穿汉服拍照超出片' },
      { name: '大雁塔', emoji: '🗼', kind: 'sight', ticket: '大慈恩寺约40元，登塔另收费', tip: '北广场有音乐喷泉' },
      { name: '回民街', emoji: '🍢', kind: 'photo', ticket: '免费', tip: '小吃一条街' },
      { name: '华清宫', emoji: '♨️', kind: 'sight', ticket: '约120元', tip: '可与兵马俑同一天安排' },
    ],
    foods: [
      { name: '肉夹馍', emoji: '🥙', desc: '腊汁肉夹馍' },
      { name: '羊肉泡馍', emoji: '🍲', desc: '自己掰馍' },
      { name: 'biangbiang面', emoji: '🍜', desc: '宽面油泼' },
      { name: '凉皮', emoji: '🥗', desc: '秦镇米皮' },
      { name: '甑糕', emoji: '🍠', desc: '甜糯早餐' },
    ],
    route: [
      '第1天：兵马俑 → 华清宫（临潼一日）',
      '第2天：城墙骑行 → 钟鼓楼 → 回民街',
      '第3天：陕西历史博物馆 → 大雁塔 → 大唐不夜城夜景',
    ],
  },
  杭州: {
    spots: [
      { name: '西湖', emoji: '🌸', kind: 'photo', ticket: '免费', tip: '断桥、苏堤、白堤，租车或步行环湖' },
      { name: '灵隐寺', emoji: '🛕', kind: 'sight', ticket: '飞来峰约45元 + 灵隐寺香花券约30元', tip: '早上去人少' },
      { name: '雷峰塔', emoji: '🗼', kind: 'sight', ticket: '约40元', tip: '登塔俯瞰西湖' },
      { name: '西溪湿地', emoji: '🛶', kind: 'sight', ticket: '约80元', tip: '坐摇橹船' },
      { name: '龙井村', emoji: '🍵', kind: 'photo', ticket: '免费', tip: '茶园拍照，春天采茶季' },
      { name: '宝石山', emoji: '🌄', kind: 'photo', ticket: '免费', tip: '看西湖日出日落的好机位' },
    ],
    foods: [
      { name: '西湖醋鱼', emoji: '🐟', desc: '杭帮名菜' },
      { name: '东坡肉', emoji: '🍖', desc: '软糯不腻' },
      { name: '片儿川', emoji: '🍜', desc: '杭州特色面' },
      { name: '龙井虾仁', emoji: '🦐', desc: '茶香虾仁' },
      { name: '葱包桧', emoji: '🌯', desc: '河坊街小吃' },
    ],
    route: [
      '第1天：断桥 → 白堤 → 孤山 → 苏堤 → 雷峰塔日落',
      '第2天：灵隐寺 → 龙井村喝茶 → 河坊街',
      '第3天：西溪湿地 → 宝石山',
    ],
  },
  南京: {
    spots: [
      { name: '中山陵', emoji: '🏛️', kind: 'sight', ticket: '免费，需预约', tip: '台阶很多，穿舒服的鞋' },
      { name: '侵华日军南京大屠杀遇难同胞纪念馆', emoji: '🕯️', kind: 'sight', ticket: '免费，需预约', tip: '周一闭馆' },
      { name: '夫子庙 / 秦淮河', emoji: '🏮', kind: 'photo', ticket: '街区免费，游船另收费', tip: '夜游秦淮河最有感觉' },
      { name: '鸡鸣寺', emoji: '🌸', kind: 'photo', ticket: '约10元', tip: '春天樱花大道拍照' },
      { name: '颐和路', emoji: '🍂', kind: 'photo', ticket: '免费', tip: '民国建筑+梧桐树' },
      { name: '总统府', emoji: '🏯', kind: 'sight', ticket: '约40元', tip: '近代史必看' },
    ],
    foods: [
      { name: '盐水鸭', emoji: '🦆', desc: '南京招牌' },
      { name: '鸭血粉丝汤', emoji: '🍜', desc: '早餐必吃' },
      { name: '小笼汤包', emoji: '🥟', desc: '先开窗后喝汤' },
      { name: '牛肉锅贴', emoji: '🥠', desc: '外酥里嫩' },
    ],
    route: [
      '第1天：中山陵 → 明孝陵 → 总统府 → 夫子庙夜游秦淮',
      '第2天：南京博物院 → 颐和路 → 鸡鸣寺 → 玄武湖',
    ],
  },
  厦门: {
    spots: [
      { name: '鼓浪屿', emoji: '🏝️', kind: 'sight', ticket: '轮渡往返约35元，部分景点另收费', tip: '船票要提前在官方渠道买' },
      { name: '厦门大学', emoji: '🎓', kind: 'photo', ticket: '免费，需预约', tip: '芙蓉隧道涂鸦+芙蓉湖' },
      { name: '南普陀寺', emoji: '🛕', kind: 'sight', ticket: '免费', tip: '就在厦大旁边' },
      { name: '环岛路', emoji: '🚲', kind: 'photo', ticket: '免费', tip: '海边骑行，傍晚最舒服' },
      { name: '沙坡尾', emoji: '📸', kind: 'photo', ticket: '免费', tip: '避风坞文艺小渔港' },
      { name: '曾厝垵', emoji: '🍢', kind: 'sight', ticket: '免费', tip: '小吃街' },
    ],
    foods: [
      { name: '沙茶面', emoji: '🍜', desc: '厦门灵魂' },
      { name: '海蛎煎', emoji: '🍳', desc: '闽南名吃' },
      { name: '土笋冻', emoji: '🍮', desc: '敢尝试吗' },
      { name: '花生汤', emoji: '🥜', desc: '甜甜的' },
    ],
    route: [
      '第1天：鼓浪屿全天（日光岩、菽庄花园、龙头路小吃）',
      '第2天：南普陀寺 → 厦门大学 → 沙坡尾 → 环岛路骑行 → 曾厝垵',
    ],
  },
  三亚: {
    spots: [
      { name: '亚龙湾', emoji: '🏖️', kind: 'sight', ticket: '海滩免费', tip: '水最清，适合浮潜' },
      { name: '蜈支洲岛', emoji: '🤿', kind: 'sight', ticket: '以官方为准', tip: '潜水、海上项目多' },
      { name: '天涯海角', emoji: '🪨', kind: 'photo', ticket: '以官方为准', tip: '经典打卡巨石' },
      { name: '椰梦长廊', emoji: '🌴', kind: 'photo', ticket: '免费', tip: '三亚湾日落，椰林剪影' },
      { name: '南山文化旅游区', emoji: '🙏', kind: 'sight', ticket: '以官方为准', tip: '海上观音' },
    ],
    foods: [
      { name: '海鲜加工', emoji: '🦞', desc: '第一市场买了现做' },
      { name: '文昌鸡', emoji: '🐔', desc: '海南四大名菜' },
      { name: '清补凉', emoji: '🥥', desc: '消暑甜品' },
      { name: '抱罗粉', emoji: '🍜', desc: '海南米粉' },
    ],
    route: [
      '第1天：三亚湾 → 椰梦长廊日落 → 第一市场吃海鲜',
      '第2天：蜈支洲岛全天',
      '第3天：亚龙湾 → 天涯海角 / 南山',
    ],
  },
  长沙: {
    spots: [
      { name: '橘子洲', emoji: '🗿', kind: 'photo', ticket: '免费', tip: '青年毛泽东雕像，节假日有烟花' },
      { name: '岳麓山', emoji: '🍁', kind: 'sight', ticket: '免费', tip: '爱晚亭秋天红叶' },
      { name: '湖南博物院', emoji: '🏺', kind: 'sight', ticket: '免费，需预约', tip: '马王堆辛追夫人' },
      { name: '五一广场 / 坡子街', emoji: '🌃', kind: 'photo', ticket: '免费', tip: '夜生活很热闹' },
      { name: '文和友', emoji: '🏮', kind: 'photo', ticket: '免费进入', tip: '复古市井场景，排队吃小龙虾' },
    ],
    foods: [
      { name: '臭豆腐', emoji: '🖤', desc: '黑色经典' },
      { name: '口味虾', emoji: '🦞', desc: '夏天夜宵' },
      { name: '剁椒鱼头', emoji: '🐟', desc: '湘菜招牌' },
      { name: '糖油粑粑', emoji: '🍡', desc: '甜甜软软' },
      { name: '茶颜悦色', emoji: '🧋', desc: '长沙奶茶' },
    ],
    route: [
      '第1天：湖南博物院 → 岳麓山 → 橘子洲',
      '第2天：太平老街 → 坡子街 → 文和友 → 五一广场夜景',
    ],
  },
  青岛: {
    spots: [
      { name: '栈桥', emoji: '🌉', kind: 'photo', ticket: '免费', tip: '冬天看海鸥' },
      { name: '八大关', emoji: '🏰', kind: 'photo', ticket: '免费', tip: '万国建筑，秋天银杏' },
      { name: '天主教堂', emoji: '⛪', kind: 'photo', ticket: '以官方为准', tip: '门口婚纱照圣地' },
      { name: '崂山', emoji: '⛰️', kind: 'sight', ticket: '以官方为准', tip: '山海相连，留一整天' },
      { name: '小麦岛', emoji: '🌿', kind: 'photo', ticket: '免费', tip: '大草坪+海' },
      { name: '青岛啤酒博物馆', emoji: '🍺', kind: 'sight', ticket: '以官方为准', tip: '喝原浆' },
    ],
    foods: [
      { name: '海鲜大排档', emoji: '🦐', desc: '营口路市场' },
      { name: '鲅鱼水饺', emoji: '🥟', desc: '青岛特色' },
      { name: '散啤', emoji: '🍺', desc: '用塑料袋装' },
      { name: '辣炒蛤蜊', emoji: '🐚', desc: '配啤酒' },
    ],
    route: [
      '第1天：栈桥 → 天主教堂 → 信号山 → 八大关',
      '第2天：崂山一日游',
      '第3天：啤酒博物馆 → 小麦岛 → 五四广场夜景',
    ],
  },
  大理: {
    spots: [
      { name: '洱海生态廊道', emoji: '🚲', kind: 'photo', ticket: '免费', tip: '骑行或租车环洱海' },
      { name: '大理古城', emoji: '🏘️', kind: 'sight', ticket: '免费', tip: '人民路晚上很热闹' },
      { name: '崇圣寺三塔', emoji: '🛕', kind: 'sight', ticket: '约75元', tip: '聚影池倒影拍三塔' },
      { name: '双廊古镇', emoji: '🌅', kind: 'photo', ticket: '免费', tip: '洱海边日出' },
      { name: '喜洲古镇', emoji: '🌾', kind: 'photo', ticket: '免费', tip: '麦田+白族民居，吃喜洲粑粑' },
      { name: '苍山', emoji: '⛰️', kind: 'sight', ticket: '索道另收费，以官方为准', tip: '海拔高，带外套' },
    ],
    foods: [
      { name: '喜洲粑粑', emoji: '🫓', desc: '甜咸都有' },
      { name: '乳扇', emoji: '🧀', desc: '白族奶制品' },
      { name: '酸辣鱼', emoji: '🐟', desc: '洱海边特色' },
      { name: '菌子火锅', emoji: '🍄', desc: '夏季限定，一定要煮熟' },
    ],
    route: [
      '第1天：大理古城 → 崇圣寺三塔 → 人民路夜市',
      '第2天：环洱海：才村 → 喜洲 → 双廊（看日落）',
      '第3天：苍山索道',
    ],
  },
};

export const CITIES: Place[] = CITY_BASE.map(([name, code, lat, lon]) => ({
  name,
  code: code || undefined,
  lat,
  lon,
  guide: GUIDES[name],
}));

export const HOT_DESTINATIONS = Object.keys(GUIDES);

export function normalizeCityName(input: string): string {
  return input.trim().replace(/(市|省|自治区|特别行政区)$/, '');
}

export function findBuiltInCity(input: string): Place | undefined {
  const name = normalizeCityName(input);
  return CITIES.find((c) => c.name === name);
}
