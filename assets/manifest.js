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
    },
    {
      "key": "item_chest",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, ornate golden treasure chest, closed, red velvet trim, glowing gems, fantasy game item, single object"
    },
    {
      "key": "item_chest_open",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, open golden treasure chest overflowing with light and gold coins, fantasy game item, single object"
    },
    {
      "key": "item_coin",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, shiny gold coin with star emblem, game item, single object"
    },
    {
      "key": "item_gem_s",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, small green crystal gem, faceted, shiny, game item, single object"
    },
    {
      "key": "item_gem_m",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, blue crystal gem, faceted, shiny, game item, single object"
    },
    {
      "key": "item_gem_l",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, large pink crystal gem, faceted, sparkling, game item, single object"
    },
    {
      "key": "item_cake",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, strawberry shortcake slice, cute food, game item, single object"
    },
    {
      "key": "item_magnet",
      "kind": "sprite",
      "size": 96,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, red horseshoe magnet, sparkle, game item, single object"
    },
    {
      "key": "fx_star",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, glowing yellow star shaped magic projectile with sparkles"
    },
    {
      "key": "fx_arrow",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, glowing green energy arrow, horizontal, pointing right"
    },
    {
      "key": "fx_shard",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, glowing ice crystal shard, horizontal, pointing right"
    },
    {
      "key": "fx_fireball",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, blazing fireball, flames"
    },
    {
      "key": "fx_slash",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, crescent sword slash arc, white and red energy trail"
    },
    {
      "key": "fx_explosion",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, big fiery explosion burst, round"
    },
    {
      "key": "fx_lightning",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, vertical lightning bolt strike, electric blue and white"
    },
    {
      "key": "fx_orb",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, glowing holy magic orb, white and gold light"
    },
    {
      "key": "fx_moon",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, glowing golden crescent moon blade"
    },
    {
      "key": "fx_foxfire",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, orange fox fire spirit flame wisp"
    },
    {
      "key": "fx_tornado",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, green whirlwind tornado, wind swirl"
    },
    {
      "key": "fx_holy",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, top-down view of glowing blue holy water splash circle"
    },
    {
      "key": "fx_rune",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, top-down view of glowing purple magic circle with runes"
    },
    {
      "key": "fx_meteor",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, flaming meteor falling diagonally with fire trail"
    },
    {
      "key": "fx_bullet",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, red glowing energy orb bullet"
    },
    {
      "key": "fx_beam",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, horizontal cyan laser beam, straight, wide"
    },
    {
      "key": "fx_aura",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, top-down view of golden ring of holy light, circle"
    },
    {
      "key": "fx_hit",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, bright white impact spark burst, small"
    },
    {
      "key": "fx_burst",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, radial burst of light rays, rainbow sparkles"
    },
    {
      "key": "fx_burn",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, top-down view of burning fire on ground, flames circle"
    },
    {
      "key": "fx_frost",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, top-down view of frost ice burst, snowflakes"
    },
    {
      "key": "fx_thunder",
      "kind": "fx",
      "size": 256,
      "width": 1024,
      "height": 1024,
      "prompt": "no humans, electric spark ball, blue lightning"
    }
  ],
  "fx_suffix": "visual effect, glowing light, pure black background, centered, isolated, no characters, no text"
};
