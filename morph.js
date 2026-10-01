import * as THREE from 'three';

// Scrub a baked mechanical transformation (a glTF clip made with
// scripts/morph_kit.py, e.g. "LensToReel") by a 0..1 value from the timeline.
// Recipe: references/mechanical-morph.md.
//
//   const morph = bindMorph(hero, THREE.AnimationClip.findByName(gltf.animations, 'LensToReel'));
//   tl.to(pose, { morph: 1, duration: 1.25, ease: 'power1.inOut' }, t);   // in a scene's build
//   morph.set(pose.morph);                                                 // every frame
//
// Why not action.play()/mixer.update(dt): the scroll owns time. Setting
// action.time and updating by 0 makes the pose a pure function of the
// scroll position, so scrubbing backwards is exact.

export function bindMorph(root, clip) {
  if (!clip) return { set() {}, duration: 0 };
  const mixer = new THREE.AnimationMixer(root);
  const action = mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.play();
  let last = -1;
  return {
    duration: clip.duration,
    set(t) {
      const time = THREE.MathUtils.clamp(t, 0, 1) * clip.duration;
      if (time === last) return;
      last = time;
      action.time = time;
      mixer.update(0);
    },
  };
}

// Material hand-over during a morph (materials can't morph): lerp colour and
// PBR values over part of the progress, e.g. rubber grip → glossy film roll.
//   const film = materialBlend(grip.material, { color: '#2b1a0e', roughness: 0.26, metalness: 0.35 }, 0.3, 0.65);
//   film.set(pose.morph);
export function materialBlend(material, to, from = 0, until = 1) {
  const m = material.clone();
  const start = { color: m.color.clone(), roughness: m.roughness, metalness: m.metalness };
  const end = { color: new THREE.Color(to.color ?? m.color), roughness: to.roughness ?? m.roughness, metalness: to.metalness ?? m.metalness };
  return {
    material: m,
    set(t) {
      const f = THREE.MathUtils.smoothstep(t, from, until);
      m.color.lerpColors(start.color, end.color, f);
      m.roughness = THREE.MathUtils.lerp(start.roughness, end.roughness, f);
      m.metalness = THREE.MathUtils.lerp(start.metalness, end.metalness, f);
    },
  };
}
