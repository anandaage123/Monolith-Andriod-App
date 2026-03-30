import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StatusBar,
  View,
  Text,
  Animated,
  StyleSheet,
  Easing,
  Dimensions,
  AppState,
  Pressable,
  Platform,
  TouchableOpacity,
} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import UpdateModal from './src/components/UpdateModal';
import { ThemeProvider } from './src/context/ThemeContext';
import { checkForUpdates, VersionManifest } from './src/services/UpdateService';

const { width, height } = Dimensions.get('window');

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  bg:          '#080612',
  accent:      '#5B4FE8',
  accentMid:   '#8B7FF5',
  accentLight: '#C4BDFF',
  gold:        '#E8C547',
  white:       '#FFFFFF',
  muted:       'rgba(196, 189, 255, 0.45)',
  border:      'rgba(139, 127, 245, 0.2)',
  // Easter egg palette — warm rose/blush
  rose:        '#FF6B9D',
  roseDim:     '#C44B73',
  roseFaint:   'rgba(255,107,157,0.15)',
  blush:       '#FFB3C6',
  cream:       '#FFF0F3',
};

// ─────────────────────────────────────────────────────────────────────────────
// OrbitalArc
// ─────────────────────────────────────────────────────────────────────────────
function OrbitalArc({
  size, thickness = 1.5, color, duration, reverse = false,
}: {
  size: number; thickness?: number; color: string;
  duration: number; reverse?: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1, duration, easing: Easing.linear, useNativeDriver: true,
      }),
    ).start();
  }, []);
  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });
  return (
    <Animated.View
      style={{
        position: 'absolute', width: size, height: size,
        borderRadius: size / 2, borderWidth: thickness,
        borderColor: color,
        borderTopColor: 'transparent', borderRightColor: 'transparent',
        borderBottomColor: color, borderLeftColor: 'transparent',
        transform: [{ rotate }],
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StarField
// ─────────────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 2 + 0.5,
  op: Math.random() * 0.4 + 0.1,
  dur: 1500 + Math.random() * 2500,
}));

function TwinklingStar({ star }: { star: typeof STARS[0] }) {
  const anim = useRef(new Animated.Value(star.op)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: star.op * 0.15, duration: star.dur,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: star.op, duration: star.dur,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', left: star.x, top: star.y,
        width: star.size, height: star.size,
        borderRadius: star.size / 2,
        backgroundColor: T.accentLight,
        opacity: anim,
      }}
    />
  );
}

function StarField({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {STARS.map((s) => <TwinklingStar key={s.id} star={s} />)}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GlowOrb
// ─────────────────────────────────────────────────────────────────────────────
function GlowOrb({
  cx, cy, size, color, opacity, dur,
}: {
  cx: number; cy: number; size: number; color: string; opacity: number; dur: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.18, duration: dur,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1, duration: dur,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - size / 2, top: cy - size / 2,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity, transform: [{ scale }],
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CornerBracket
// ─────────────────────────────────────────────────────────────────────────────
function CornerBracket({
  pos, size = 18, color, opacity,
}: {
  pos: 'tl' | 'tr' | 'bl' | 'br';
  size?: number; color: string; opacity: Animated.Value;
}) {
  const abs: Record<string, number> = {};
  if (pos === 'tl' || pos === 'bl') abs.left = 0; else abs.right = 0;
  if (pos === 'tl' || pos === 'tr') abs.top = 0;  else abs.bottom = 0;
  const sx = pos === 'tr' || pos === 'br' ? -1 : 1;
  const sy = pos === 'bl' || pos === 'br' ? -1 : 1;
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: size, opacity },
        abs,
        { transform: [{ scaleX: sx }, { scaleY: sy }] },
      ]}
    >
      <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: 0, left: 0, width: 1, height: size, backgroundColor: color }} />
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SeekBar
// ─────────────────────────────────────────────────────────────────────────────
function SeekBar({ progress }: { progress: Animated.Value }) {
  const barWidth = progress.interpolate({
    inputRange: [0, 1], outputRange: ['0%', '100%'],
  });
  return (
    <View style={styles.seekBarTrack}>
      <Animated.View style={[styles.seekBarFill, { width: barWidth }]} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EnterButton
// ─────────────────────────────────────────────────────────────────────────────
function EnterButton({ onPress, visible }: { onPress: () => void; visible: Animated.Value }) {
  const ripple     = useRef(new Animated.Value(0)).current;
  const rippleOp   = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const borderGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderGlow, {
          toValue: 1, duration: 1800,
          easing: Easing.inOut(Easing.sin), useNativeDriver: false,
        }),
        Animated.timing(borderGlow, {
          toValue: 0, duration: 1800,
          easing: Easing.inOut(Easing.sin), useNativeDriver: false,
        }),
      ]),
    ).start();
  }, []);

  const handlePressIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.93, useNativeDriver: true, tension: 200, friction: 10,
    }).start();

  const handlePressOut = () =>
    Animated.spring(pressScale, {
      toValue: 1, useNativeDriver: true, tension: 200, friction: 10,
    }).start();

  const handlePress = () => {
    ripple.setValue(0);
    rippleOp.setValue(0.5);
    Animated.parallel([
      Animated.timing(ripple, {
        toValue: 1, duration: 480,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(rippleOp, {
        toValue: 0, duration: 480, useNativeDriver: true,
      }),
    ]).start(() => onPress());
  };

  const rippleScale = ripple.interpolate({
    inputRange: [0, 1], outputRange: [0.2, 2.4],
  });
  const borderColor = borderGlow.interpolate({
    inputRange: [0, 1], outputRange: [T.border, T.accentMid],
  });

  return (
    <Animated.View style={{ opacity: visible, transform: [{ scale: pressScale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ alignItems: 'center' }}
      >
        <Animated.View style={[styles.enterBtn, { borderColor }]}>
          <Animated.View
            style={[styles.ripple, { opacity: rippleOp, transform: [{ scale: rippleScale }] }]}
          />
          <View style={styles.enterBtnInner}>
            <View style={styles.chevronLeft} />
            <Text style={styles.enterBtnText}>ENTER</Text>
            <View style={styles.chevronRight} />
          </View>
        </Animated.View>
        <Text style={styles.enterSubtext}>tap to continue</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FloatingPetal — a small animated heart/petal that rises from bottom
// ─────────────────────────────────────────────────────────────────────────────
function FloatingPetal({ delay, x }: { delay: number; x: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.4 + Math.random() * 0.6)).current;
  const rotate     = useRef(new Animated.Value(Math.random() * 40 - 20)).current;

  useEffect(() => {
    const run = () => {
      translateY.setValue(0);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.7, duration: 600, useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -(height * 0.75 + Math.random() * 80),
            duration: 3500 + Math.random() * 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rotate, {
            toValue: Math.random() * 60 - 30,
            duration: 3500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0, duration: 800, useNativeDriver: true,
        }),
      ]).start(() => setTimeout(run, Math.random() * 1000));
    };
    run();
  }, []);

  const rot = rotate.interpolate({
    inputRange: [-30, 30], outputRange: ['-30deg', '30deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 60,
        left: x,
        opacity,
        transform: [{ translateY }, { rotate: rot }, { scale }],
      }}
    >
      {/* Simple heart using two overlapping views */}
      <Text style={{ fontSize: 18, color: T.rose }}>♥</Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LetterReveal — each letter of AMRUTA animates in staggered
// ─────────────────────────────────────────────────────────────────────────────
function LetterReveal({ text, style, baseDelay = 0 }: {
  text: string; style?: object; baseDelay?: number;
}) {
  const letters = text.split('');
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.sequence([
        Animated.delay(baseDelay + i * 120),
        Animated.spring(anim, {
          toValue: 1, tension: 60, friction: 6, useNativeDriver: true,
        }),
      ]),
    );
    Animated.parallel(animations).start();
  }, []);

  return (
    <View style={{ flexDirection: 'row' }}>
      {letters.map((letter, i) => {
        const translateY = anims[i].interpolate({
          inputRange: [0, 1], outputRange: [30, 0],
        });
        return (
          <Animated.Text
            key={i}
            style={[
              style,
              { opacity: anims[i], transform: [{ translateY }] },
            ]}
          >
            {letter}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EasterEggOverlay — the full-screen love message
// ─────────────────────────────────────────────────────────────────────────────
const PETAL_POSITIONS = [
  width * 0.05, width * 0.15, width * 0.27, width * 0.4,
  width * 0.52, width * 0.65, width * 0.78, width * 0.88,
];

function EasterEggOverlay({ onClose }: { onClose: () => void }) {
  const backdropFade  = useRef(new Animated.Value(0)).current;
  const contentFade   = useRef(new Animated.Value(0)).current;
  const contentSlide  = useRef(new Animated.Value(60)).current;
  const heartScale    = useRef(new Animated.Value(0)).current;
  const heartPulse    = useRef(new Animated.Value(1)).current;
  const lineFade      = useRef(new Animated.Value(0)).current;
  const poem1Fade     = useRef(new Animated.Value(0)).current;
  const poem2Fade     = useRef(new Animated.Value(0)).current;
  const poem3Fade     = useRef(new Animated.Value(0)).current;
  const closeFade     = useRef(new Animated.Value(0)).current;
  const roseGlowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Rose glow breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(roseGlowScale, {
          toValue: 1.3, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(roseGlowScale, {
          toValue: 1, duration: 2000,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();

    // Heart idle pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.18, duration: 700,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(heartPulse, {
          toValue: 1, duration: 700,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();

    // Entrance sequence
    Animated.sequence([
      // 1. Backdrop
      Animated.timing(backdropFade, {
        toValue: 1, duration: 500, useNativeDriver: true,
      }),
      // 2. Content slides up
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1, duration: 600, useNativeDriver: true,
        }),
        Animated.timing(contentSlide, {
          toValue: 0, duration: 700,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      // 3. Heart springs in
      Animated.delay(100),
      Animated.spring(heartScale, {
        toValue: 1, tension: 50, friction: 5, useNativeDriver: true,
      }),
      // 4. Divider line
      Animated.delay(200),
      Animated.timing(lineFade, {
        toValue: 1, duration: 600, useNativeDriver: true,
      }),
      // 5. Poem lines stagger in
      Animated.delay(100),
      Animated.timing(poem1Fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(poem2Fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(poem3Fade, { toValue: 1, duration: 700, useNativeDriver: true }),
      // 6. Close hint
      Animated.delay(600),
      Animated.timing(closeFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropFade, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(contentFade,  { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.eggBackdrop, { opacity: backdropFade }]}>
      {/* Rose glow orb center */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.roseGlow,
          { transform: [{ scale: roseGlowScale }] },
        ]}
      />

      {/* Floating petals */}
      {PETAL_POSITIONS.map((x, i) => (
        <FloatingPetal key={i} x={x} delay={i * 200} />
      ))}

      {/* Main card */}
      <Animated.View
        style={[
          styles.eggCard,
          {
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          },
        ]}
      >
        {/* Heart */}
        <Animated.View
          style={[
            styles.heartWrap,
            { transform: [{ scale: Animated.multiply(heartScale, heartPulse) }] },
          ]}
        >
          <Text style={styles.heartEmoji}>♥</Text>
        </Animated.View>

        {/* Name reveal */}
        <View style={styles.nameRevealWrap}>
          <Text style={styles.eggFor}>for</Text>
          <LetterReveal
            text="Amruta"
            style={styles.eggName}
            baseDelay={200}
          />
        </View>

        {/* Divider */}
        <Animated.View style={[styles.eggDivider, { opacity: lineFade }]} />

        {/* Poem */}
        <View style={styles.poemWrap}>
          <Animated.Text style={[styles.poemLine, { opacity: poem1Fade }]}>
            In every line of code I write,
          </Animated.Text>
          <Animated.Text style={[styles.poemLine, styles.poemLineAccent, { opacity: poem2Fade }]}>
            you are the logic that makes it right.
          </Animated.Text>
          <Animated.Text style={[styles.poemLine, { opacity: poem3Fade }]}>
            This app runs on caffeine and your love.
          </Animated.Text>
        </View>

        {/* Signature */}
        <Animated.View style={[styles.eggSignature, { opacity: closeFade }]}>
          <Text style={styles.eggSignatureText}>— Anand  🤍</Text>
        </Animated.View>
      </Animated.View>

      {/* Close */}
      <Animated.View style={[styles.eggCloseWrap, { opacity: closeFade }]}>
        <TouchableOpacity onPress={handleClose} style={styles.eggCloseBtn}>
          <Text style={styles.eggCloseBtnText}>close</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [showSplash,     setShowSplash]     = useState(true);
  const [showEasterEgg,  setShowEasterEgg]  = useState(false);
  const [updateManifest, setUpdateManifest] = useState<VersionManifest | null>(null);

  // Easter egg tap tracking
  const tapCount    = useRef(0);
  const tapTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const masterFade   = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.4)).current;
  const logoRotate   = useRef(new Animated.Value(-30)).current;
  const nameFade     = useRef(new Animated.Value(0)).current;
  const nameSlide    = useRef(new Animated.Value(50)).current;
  const bracketFade  = useRef(new Animated.Value(0)).current;
  const creatorFade  = useRef(new Animated.Value(0)).current;
  const seekProgress = useRef(new Animated.Value(0)).current;
  const btnFade      = useRef(new Animated.Value(0)).current;
  const exitFade     = useRef(new Animated.Value(1)).current;
  const corePulse    = useRef(new Animated.Value(1)).current;
  // Logo shake when tapping toward easter egg
  const logoShake    = useRef(new Animated.Value(0)).current;
  

  // ── Easter egg trigger ──
  const handleLogoTap = useCallback(() => {
    tapCount.current += 1;

    // Small shake feedback on each tap
    Animated.sequence([
      Animated.timing(logoShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(logoShake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(logoShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();

    if (tapCount.current >= 10) {
      tapCount.current = 0;
      if (tapTimer.current) clearTimeout(tapTimer.current);
      setShowEasterEgg(true);
      return;
    }

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 1500);
  }, []);

  const navigateToDashboard = useCallback(async () => {
    Animated.timing(exitFade, {
      toValue: 0, duration: 450,
      easing: Easing.in(Easing.cubic), useNativeDriver: true,
    }).start(async () => {
      setShowSplash(false);
      try {
        const manifest = await checkForUpdates();
        if (manifest) setUpdateManifest(manifest);
      } catch (_) {}
    });
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(corePulse, {
          toValue: 1.12, duration: 1600,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(corePulse, {
          toValue: 1, duration: 1600,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.timing(masterFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 8, friction: 4, useNativeDriver: true }),
        Animated.timing(logoRotate, {
          toValue: 0, duration: 900,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(bracketFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.delay(180),
      Animated.parallel([
        Animated.timing(nameFade, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(nameSlide, {
          toValue: 0, duration: 600,
          easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
      Animated.delay(120),
      Animated.timing(creatorFade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(seekProgress, {
        toValue: 1, duration: 1800,
        easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
      }),
      Animated.delay(200),
      Animated.timing(btnFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const sub = AppState.addEventListener('change', async (state) => {
      if (state === 'active') {
        try {
          const manifest = await checkForUpdates();
          if (manifest) setUpdateManifest(manifest);
        } catch (_) {}
      }
    });
    return () => { sub.remove(); };
  }, []);

  if (showSplash) {
    const logoRot = logoRotate.interpolate({
      inputRange: [-30, 0], outputRange: ['-30deg', '0deg'],
    });

    return (
      <Animated.View style={[styles.container, { opacity: exitFade }]}>
        <StatusBar barStyle="light-content" backgroundColor={T.bg} translucent />

        {/* Background glows */}
        <GlowOrb cx={width * 0.15} cy={height * 0.2}  size={320} color={T.accent}    opacity={0.06} dur={7000} />
        <GlowOrb cx={width * 0.85} cy={height * 0.75} size={260} color={T.accentMid} opacity={0.05} dur={9000} />
        <GlowOrb cx={width * 0.5}  cy={height * 0.48} size={200} color={T.gold}      opacity={0.025} dur={5500} />

        <StarField opacity={masterFade} />
        <View style={styles.topRule} />

        <View style={styles.centerContent}>
          {/* Logo — tappable for easter egg */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleLogoTap}
            style={styles.logoTouchable}
          >
            <Animated.View
              style={[
                styles.logoWrap,
                {
                  transform: [
                    { scale: logoScale },
                    { rotate: logoRot },
                    { translateX: logoShake },
                  ],
                },
              ]}
            >
              <OrbitalArc size={170} color={T.accentLight} duration={6000} thickness={1} />
              <OrbitalArc size={130} color={T.accentMid}   duration={4000} thickness={1.5} reverse />
              <OrbitalArc size={92}  color={T.accentLight} duration={3000} thickness={1} />

              <View style={styles.logoInner}>
                <CornerBracket pos="tl" color={T.accentLight} opacity={bracketFade} size={20} />
                <CornerBracket pos="tr" color={T.accentLight} opacity={bracketFade} size={20} />
                <CornerBracket pos="bl" color={T.accentLight} opacity={bracketFade} size={20} />
                <CornerBracket pos="br" color={T.accentLight} opacity={bracketFade} size={20} />
                <Animated.View
                  style={[
                    styles.coreDiamond,
                    { transform: [{ scale: corePulse }, { rotate: '45deg' }] },
                  ]}
                >
                  <View style={styles.coreDiamondInner} />
                </Animated.View>
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* App title */}
          <Animated.View
            style={[
              styles.titleBlock,
              { opacity: nameFade, transform: [{ translateY: nameSlide }] },
            ]}
          >
            <Text style={styles.appName}>MONOLITH</Text>
            <View style={styles.goldLine} />
            <Text style={styles.appSubtitle}>BY ANAND AAGE</Text>
          </Animated.View>

          {/* Seek bar */}
          <Animated.View style={[styles.seekWrap, { opacity: creatorFade }]}>
            <SeekBar progress={seekProgress} />
            <View style={styles.seekLabels}>
              <Text style={styles.seekLabel}>LOADING SYSTEM</Text>
              <Animated.Text style={[styles.seekLabel, { opacity: btnFade }]}>READY</Animated.Text>
            </View>
          </Animated.View>

          <EnterButton onPress={navigateToDashboard} visible={btnFade} />
        </View>

        {/* Watermark */}
        <Animated.View style={[styles.watermark, { opacity: creatorFade }]}>
          <Text style={styles.watermarkLabel}>CRAFTED BY</Text>
          <Text style={styles.watermarkName}>ANAND AAGE</Text>
        </Animated.View>

        <View style={styles.bottomRule} />

        {/* Easter egg overlay — rendered on top */}
        {showEasterEgg && (
          <EasterEggOverlay onClose={() => setShowEasterEgg(false)} />
        )}
      </Animated.View>
    );
  }

  return (
    <>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
      {updateManifest && (
        <UpdateModal manifest={updateManifest} onDismiss={() => setUpdateManifest(null)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: T.bg,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  topRule: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 44 : 52,
    left: 0, right: 0, height: 0.5, backgroundColor: T.border,
  },
  bottomRule: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 2, backgroundColor: T.accentMid, opacity: 0.4,
  },
  centerContent: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, width: '100%',
  },

  // Logo
  logoTouchable: { alignItems: 'center', justifyContent: 'center' },
  logoWrap: {
    width: 180, height: 180,
    alignItems: 'center', justifyContent: 'center', marginBottom: 40,
  },
  logoInner: {
    position: 'absolute', width: 64, height: 64,
    alignItems: 'center', justifyContent: 'center',
  },
  coreDiamond: {
    width: 40, height: 40, backgroundColor: T.accent,
    alignItems: 'center', justifyContent: 'center',
    elevation: 16, shadowColor: T.accentLight,
    shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
  },
  coreDiamondInner: {
    width: 18, height: 18, backgroundColor: T.accentLight,
    opacity: 0.8, transform: [{ rotate: '-45deg' }],
  },

  // Title
  titleBlock: { alignItems: 'center', marginBottom: 40 },
  appName: {
    fontSize: 48, fontWeight: '800', color: T.white,
    letterSpacing: 12, textAlign: 'center', opacity: 0.9, marginBottom: 10,
  },
  goldLine: {
    width: 80, height: 2, backgroundColor: T.gold, marginBottom: 10, borderRadius: 1,
  },
  appSubtitle: {
    fontSize: 11, fontWeight: '400', color: T.muted, letterSpacing: 5, textAlign: 'center',
  },

  // Seek
  seekWrap: { width: '75%', marginBottom: 40 },
  seekBarTrack: {
    width: '100%', height: 1.5,
    backgroundColor: 'rgba(139,127,245,0.15)',
    borderRadius: 1, marginBottom: 10, overflow: 'hidden',
  },
  seekBarFill: { height: 1.5, backgroundColor: T.accentMid, borderRadius: 1 },
  seekLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  seekLabel: { fontSize: 9, fontWeight: '400', color: T.muted, letterSpacing: 2 },

  // Enter button
  enterBtn: {
    width: 220, height: 54, borderRadius: 4, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', marginBottom: 12,
    backgroundColor: 'rgba(91,79,232,0.08)',
  },
  enterBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  enterBtnText: {
    fontSize: 15, fontWeight: '700', color: T.accentLight, letterSpacing: 6,
  },
  chevronLeft: {
    width: 8, height: 8, borderTopWidth: 1.5, borderLeftWidth: 1.5,
    borderColor: T.accentMid, transform: [{ rotate: '-45deg' }],
  },
  chevronRight: {
    width: 8, height: 8, borderTopWidth: 1.5, borderRightWidth: 1.5,
    borderColor: T.accentMid, transform: [{ rotate: '45deg' }],
  },
  ripple: {
    position: 'absolute', width: 220, height: 54,
    borderRadius: 4, backgroundColor: T.accentMid,
  },
  enterSubtext: {
    fontSize: 9, fontWeight: '300', color: T.muted, letterSpacing: 3, opacity: 0.6,
  },

  // Watermark
  watermark: { position: 'absolute', bottom: 24, alignItems: 'center' },
  watermarkLabel: {
    fontSize: 8, fontWeight: '400', color: T.muted,
    letterSpacing: 3, opacity: 0.5, marginBottom: 2,
  },
  watermarkName: {
    fontSize: 11, fontWeight: '600', color: T.accentLight, letterSpacing: 4, opacity: 0.7,
  },

  // ── Easter Egg ──
  eggBackdrop: {
    backgroundColor: 'rgba(4,2,14,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  roseGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: T.rose,
    opacity: 0.06,
    top: height * 0.5 - 180,
    left: width * 0.5 - 180,
  },
  eggCard: {
    width: width * 0.84,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
    backgroundColor: 'rgba(12, 6, 24, 0.95)',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 32,
  },
  heartWrap: {
    marginBottom: 20,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.roseFaint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.3)',
  },
  heartEmoji: {
    fontSize: 32,
    color: T.rose,
  },
  nameRevealWrap: {
    alignItems: 'center',
    marginBottom: 6,
  },
  eggFor: {
    fontSize: 11,
    fontWeight: '300',
    color: T.muted,
    letterSpacing: 4,
    marginBottom: 6,
    textTransform: 'lowercase',
  },
  eggName: {
    fontSize: 42,
    fontWeight: '800',
    color: T.rose,
    letterSpacing: 6,
  },
  eggDivider: {
    width: 60,
    height: 1,
    backgroundColor: T.roseDim,
    opacity: 0.5,
    marginVertical: 22,
    borderRadius: 1,
  },
  poemWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  poemLine: {
    fontSize: 14,
    fontWeight: '300',
    color: 'rgba(255,230,235,0.7)',
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  poemLineAccent: {
    color: T.blush,
    fontWeight: '400',
  },
  eggSignature: {
    alignItems: 'flex-end',
    width: '100%',
  },
  eggSignatureText: {
    fontSize: 13,
    fontWeight: '400',
    color: T.muted,
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  eggCloseWrap: {
    position: 'absolute',
    bottom: 52,
    alignItems: 'center',
  },
  eggCloseBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
    backgroundColor: 'rgba(255,107,157,0.06)',
  },
  eggCloseBtnText: {
    fontSize: 12,
    fontWeight: '400',
    color: T.muted,
    letterSpacing: 4,
  },
});
