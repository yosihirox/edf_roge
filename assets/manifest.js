// 画像素材の一覧。tools/comfy_generate.py もこのファイルを読みます。
// assets/img/<key>.png が存在すればゲーム内でその画像を使い、無ければ図形で描画します。
// ※ 代入の右辺は JSON として読める形（コメント・末尾カンマなし）を保ってください。
window.ASSET_MANIFEST = {
  "style": "masterpiece, best quality, game sprite, military sci-fi, earth defense force style, clean lineart, flat colors",
  "negative": "nsfw, worst quality, low quality, blurry, text, watermark, signature, logo, frame, border, multiple views, cropped",
  "sprite_suffix": "single subject, centered, plain white background, simple background, no shadow",
  "assets": [
    {
      "key": "unit_ranger",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "1boy, soldier, green combat armor, full-face helmet with visor, holding assault rifle, backpack, full body, chibi, from side, facing right"
    },
    {
      "key": "unit_wingdiver",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, flying soldier, pink and white armored bodysuit, small mechanical flight unit wings on back, holding energy weapon, short hair, visor headgear, full body, chibi, from side, facing right"
    },
    {
      "key": "unit_fencer",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "heavy powered exoskeleton armor, bulky grey mecha suit, large tower shield on left arm, spear launcher on right arm, full helmet, no face visible, full body, chibi, from side, facing right"
    },
    {
      "key": "unit_airraider",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "1boy, soldier, orange and dark grey armor, radio backpack with antenna, holding targeting laser device, helmet with headset, full body, chibi, from side, facing right"
    },
    {
      "key": "enemy_antBlack",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant black ant, monster, insect, glossy black carapace, large mandibles, full body, from side, facing right"
    },
    {
      "key": "enemy_antRed",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant red ant, monster, insect, crimson carapace, huge mandibles, full body, from side, facing right"
    },
    {
      "key": "enemy_spider",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant spider, monster, dark brown hairy body, long legs, full body, from side, facing right"
    },
    {
      "key": "enemy_roller",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant pill bug, armored isopod monster, brown segmented shell, curled, full body, from side, facing right"
    },
    {
      "key": "enemy_wasp",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant wasp, flying insect monster, yellow and black stripes, translucent wings, stinger, full body, from side, facing right"
    },
    {
      "key": "enemy_drone",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, alien drone, small flying saucer, silver metallic disc, red glowing core, sci-fi, full body, from side, facing right"
    },
    {
      "key": "enemy_colonist",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, alien creature, frog-like giant humanoid alien, olive green skin, holding alien rifle, full body, from side, facing right"
    },
    {
      "key": "enemy_android",
      "size": 96,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, white humanoid android, faceless robot, sleek white armor plates, full body, from side, facing right"
    },
    {
      "key": "enemy_cosmonaut",
      "size": 128,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant armored alien, navy blue heavy power armor, alien soldier, large plasma gun, full body, from side, facing right"
    },
    {
      "key": "enemy_erginus",
      "size": 192,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant kaiju, reptilian monster, purple scales, spikes on back, glowing eyes, full body, from side, facing right"
    },
    {
      "key": "enemy_mothership",
      "size": 224,
      "kind": "sprite",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, alien mothership, huge silver flying saucer, glowing hatches underneath, sci-fi spaceship, full body, from side, facing right"
    },
    {
      "key": "bg_city",
      "size": 0,
      "kind": "background",
      "width": 1344,
      "height": 832,
      "prompt": "no humans, top-down view, aerial view, ruined city streets, destroyed buildings, rubble, craters, overcast, game map background, muted colors"
    },
    {
      "key": "bg_mountain",
      "size": 0,
      "kind": "background",
      "width": 1344,
      "height": 832,
      "prompt": "no humans, top-down view, aerial view, mountain military base, rocky terrain, dirt roads, forest patches, game map background, muted colors"
    },
    {
      "key": "bg_coast",
      "size": 0,
      "kind": "background",
      "width": 1344,
      "height": 832,
      "prompt": "no humans, top-down view, aerial view, coastline, sandy beach, harbor ruins, sea, game map background, muted colors"
    },
    {
      "key": "title",
      "size": 0,
      "kind": "illustration",
      "width": 1344,
      "height": 768,
      "prompt": "group of soldiers fighting giant ants in a ruined city, green armored soldier with rifle, flying girl soldier with mechanical wings, heavy armored exosuit with shield, soldier calling airstrike, alien mothership in sky, dramatic, explosion, wide shot, key visual"
    },
    {
      "key": "card_af14",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, futuristic assault rifle, item illustration, dark background, centered"
    },
    {
      "key": "card_storkaf",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, futuristic assault rifle, item illustration, dark background, centered"
    },
    {
      "key": "card_blazer",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, red laser rifle, item illustration, dark background, centered"
    },
    {
      "key": "card_slaughter",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, futuristic shotgun, item illustration, dark background, centered"
    },
    {
      "key": "card_lysander",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, long sniper rifle, item illustration, dark background, centered"
    },
    {
      "key": "card_stringer",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, sleek railgun sniper, item illustration, dark background, centered"
    },
    {
      "key": "card_goliath",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, rocket launcher, item illustration, dark background, centered"
    },
    {
      "key": "card_mlra",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, multiple missile launcher pod, item illustration, dark background, centered"
    },
    {
      "key": "card_rapier",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, energy blade emitter gun, pink plasma, item illustration, dark background, centered"
    },
    {
      "key": "card_rapierg",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, energy blade emitter gun, pink plasma, item illustration, dark background, centered"
    },
    {
      "key": "card_thunderbow",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, lightning bow weapon, electric arcs, item illustration, dark background, centered"
    },
    {
      "key": "card_magblaster",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, long energy beam rifle, item illustration, dark background, centered"
    },
    {
      "key": "card_raijin",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, huge charge beam rifle, yellow lightning, item illustration, dark background, centered"
    },
    {
      "key": "card_plasmacannon",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, plasma cannon, purple glow, item illustration, dark background, centered"
    },
    {
      "key": "card_mirage",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, homing laser emitter, item illustration, dark background, centered"
    },
    {
      "key": "card_blasthole",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, pile bunker spear arm weapon, item illustration, dark background, centered"
    },
    {
      "key": "card_flashing",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, pile bunker spear arm weapon, item illustration, dark background, centered"
    },
    {
      "key": "card_gatling",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, heavy arm-mounted gatling cannon, item illustration, dark background, centered"
    },
    {
      "key": "card_handcannon",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, heavy arm-mounted gatling cannon, item illustration, dark background, centered"
    },
    {
      "key": "card_galleon",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, rapid fire autocannon, item illustration, dark background, centered"
    },
    {
      "key": "card_dexter",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, heavy arm-mounted gatling cannon, item illustration, dark background, centered"
    },
    {
      "key": "card_strafe",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, ground attack aircraft strafing, item illustration, dark background, centered"
    },
    {
      "key": "card_howitzer",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, artillery howitzer shells falling, item illustration, dark background, centered"
    },
    {
      "key": "card_spritefall",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, satellite laser beam from orbit, item illustration, dark background, centered"
    },
    {
      "key": "card_multicopter",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, armed quadcopter drone, item illustration, dark background, centered"
    },
    {
      "key": "card_killercopter",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, attack helicopter drone, item illustration, dark background, centered"
    },
    {
      "key": "card_limpet",
      "size": 0,
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, weapon icon, sticky bomb launcher, item illustration, dark background, centered"
    }
  ]
};
