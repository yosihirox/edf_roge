// 画像素材の一覧。tools/comfy_generate.py もこのファイルを読みます。
// assets/img/<key>.png があればゲームで使い、無ければ図形で代わりに描画します。
// ※ 右辺は JSON として読める形（コメント・末尾カンマなし）を保ってください。
window.ASSET_MANIFEST = {
  "style": "masterpiece, best quality, anime style, fantasy game art, vibrant colors, clean lineart",
  "negative": "nsfw, nude, cleavage, worst quality, low quality, blurry, text, watermark, signature, logo, frame, border, multiple views, cropped",
  "sprite_suffix": "single subject, centered, plain white background, simple background, no shadow",
  "assets": [
    {
      "key": "chr_lumina",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, magical girl, long pink twintails, pink and white frilly magical girl outfit, star-tipped magic wand, cheerful smile, full body, chibi, standing, facing viewer"
    },
    {
      "key": "chr_kaede",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, swordswoman, long black ponytail, red and white kimono-style light armor, katana, confident expression, full body, chibi, standing, facing viewer"
    },
    {
      "key": "chr_noa",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, android girl, short silver hair, glowing blue eyes, white and cyan sci-fi bodysuit, small floating drones, calm expression, full body, chibi, standing, facing viewer"
    },
    {
      "key": "chr_mio",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, elf archer, long blonde braided hair, pointy ears, green hunter outfit with cape, wooden longbow, gentle smile, full body, chibi, standing, facing viewer"
    },
    {
      "key": "chr_shizuku",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, ice witch, long light blue hair, blue and white witch hat and robe, crystal staff, snowflakes, cool expression, full body, chibi, standing, facing viewer"
    },
    {
      "key": "chr_rin",
      "kind": "sprite",
      "size": 128,
      "width": 1024,
      "height": 1024,
      "prompt": "1girl, fox shrine maiden, orange hair, fox ears, fox tail, red and white miko outfit, paper talismans, small fox spirit companion, playful smile, full body, chibi, standing, facing viewer"
    },
    {
      "key": "ptr_lumina",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, magical girl, long pink twintails, pink and white frilly magical girl outfit, star-tipped magic wand, cheerful smile, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "ptr_kaede",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, swordswoman, long black ponytail, red and white kimono-style light armor, katana, confident expression, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "ptr_noa",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, android girl, short silver hair, glowing blue eyes, white and cyan sci-fi bodysuit, small floating drones, calm expression, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "ptr_mio",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, elf archer, long blonde braided hair, pointy ears, green hunter outfit with cape, wooden longbow, gentle smile, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "ptr_shizuku",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, ice witch, long light blue hair, blue and white witch hat and robe, crystal staff, snowflakes, cool expression, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "ptr_rin",
      "kind": "portrait",
      "size": 768,
      "width": 832,
      "height": 1216,
      "prompt": "1girl, fox shrine maiden, orange hair, fox ears, fox tail, red and white miko outfit, paper talismans, small fox spirit companion, playful smile, full body, dynamic pose, looking at viewer"
    },
    {
      "key": "enemy_slime",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, cute green slime monster, blob, glossy, full body, single monster"
    },
    {
      "key": "enemy_bat",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, purple bat monster, spread wings, flying, full body, single monster"
    },
    {
      "key": "enemy_skeleton",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, small skeleton warrior monster, rusty sword, full body, single monster"
    },
    {
      "key": "enemy_ghost",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, white ghost monster, floating, sheet ghost, glowing eyes, full body, single monster"
    },
    {
      "key": "enemy_mushroom",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, walking mushroom monster, red cap with white spots, angry face, full body, single monster"
    },
    {
      "key": "enemy_wolf",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, grey wolf monster, snarling, running pose, full body, single monster"
    },
    {
      "key": "enemy_imp",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, small red imp demon, bat wings, holding fireball, full body, single monster"
    },
    {
      "key": "enemy_bomb",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, round black bomb monster with lit fuse, angry eyes, full body, single monster"
    },
    {
      "key": "enemy_bigslime",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, big blue slime monster with crown, blob, full body, single monster"
    },
    {
      "key": "enemy_golem",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, stone golem monster, mossy rocks, glowing runes, full body, single monster"
    },
    {
      "key": "enemy_drone",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, hostile robot drone, red sensor eye, metallic, hovering, full body, single monster"
    },
    {
      "key": "enemy_snowman",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, evil snowman monster, icicle arms, full body, single monster"
    },
    {
      "key": "boss_treant",
      "kind": "sprite",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant evil tree monster boss, glowing red eyes, twisted branches, full body"
    },
    {
      "key": "boss_frostdragon",
      "kind": "sprite",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, ice dragon boss, crystal scales, spread wings, roaring, full body"
    },
    {
      "key": "boss_mechtitan",
      "kind": "sprite",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, giant battle robot boss, heavy armor, red visor, cannons, full body"
    },
    {
      "key": "tile_forest",
      "kind": "tile",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, no animals, no objects, no characters, top-down view, flat ground texture filling the whole image, seamless texture, forest floor grass with small flowers and dirt patches, flat ground, game texture, no objects, no shadow"
    },
    {
      "key": "tile_snow",
      "kind": "tile",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, no animals, no objects, no characters, top-down view, flat ground texture filling the whole image, seamless texture, snowy ground with ice patches and footprints, flat ground, game texture, no objects, no shadow"
    },
    {
      "key": "tile_ruins",
      "kind": "tile",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, no animals, no objects, no characters, top-down view, flat ground texture filling the whole image, seamless texture, cracked stone pavement of ruined city with moss, flat ground, game texture, no objects, no shadow"
    },
    {
      "key": "tile_desert",
      "kind": "tile",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, no animals, no objects, no characters, top-down view, flat ground texture filling the whole image, seamless texture, desert sand with small rocks and dry cracks, flat ground, game texture, no objects, no shadow"
    },
    {
      "key": "tile_station",
      "kind": "tile",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, no animals, no objects, no characters, top-down view, flat ground texture filling the whole image, seamless texture, sci-fi metal floor panels with glowing lines, flat ground, game texture, no objects, no shadow"
    },
    {
      "key": "icon_wand",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, magic wand shooting star bolts, centered, simple dark background"
    },
    {
      "key": "icon_katana",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, katana sword with slash arc, centered, simple dark background"
    },
    {
      "key": "icon_beam",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, glowing cyan laser beam emitter, centered, simple dark background"
    },
    {
      "key": "icon_bow",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, wooden bow and arrow, centered, simple dark background"
    },
    {
      "key": "icon_ice",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, ice crystal shard, centered, simple dark background"
    },
    {
      "key": "icon_fox",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, orange fox spirit flame, centered, simple dark background"
    },
    {
      "key": "icon_orbit",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, orbiting glowing magic orbs, centered, simple dark background"
    },
    {
      "key": "icon_aura",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, radiant holy aura circle, centered, simple dark background"
    },
    {
      "key": "icon_lightning",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, lightning bolt from cloud, centered, simple dark background"
    },
    {
      "key": "icon_fire",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, fire bomb explosion, centered, simple dark background"
    },
    {
      "key": "icon_boomerang",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, spinning golden boomerang, centered, simple dark background"
    },
    {
      "key": "icon_mine",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, magic rune trap circle, centered, simple dark background"
    },
    {
      "key": "icon_tornado",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, green whirlwind tornado, centered, simple dark background"
    },
    {
      "key": "icon_holywater",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, blue holy water flask, centered, simple dark background"
    },
    {
      "key": "icon_drone",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, small attack drone, centered, simple dark background"
    },
    {
      "key": "icon_meteor",
      "kind": "icon",
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, game item icon, falling meteor with fire trail, centered, simple dark background"
    }
  ]
};
