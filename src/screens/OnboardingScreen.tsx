import { useRef, useState, useCallback, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    FlatList,
    Dimensions,
    ListRenderItemInfo,
    Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "../constants";
import {
    TopBarMock,
    InviteMock,
    RegisterMock,
    PeriodMock,
    RankingMock,
} from "../components/onboarding/OnboardingMocks";

export const ONBOARDING_KEY = "@cleanrats:onboarding_done";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Slide types ─────────────────────────────────────────────────────────────

type ImageSlide = {
    key: string;
    kind: "image";
    image: ReturnType<typeof require>;
    title: string;
    subtitle: string;
};

type CustomSlide = {
    key: string;
    kind: "custom";
    visual: () => ReactElement;
    title: string;
    subtitle: string;
};

type Slide = ImageSlide | CustomSlide;

// ─── Slide data ───────────────────────────────────────────────────────────────

function getSlides(t: TFunction): Slide[] {
    return [
        {
            key: "welcome",
            kind: "image",
            image: require("../../assets/cleaner_rat.png"),
            title: t("onboarding.welcome"),
            subtitle: t("onboarding.welcomeSubtitle"),
        },
        {
            key: "toca",
            kind: "image",
            image: require("../../assets/red_rat.png"),
            title: t("onboarding.slide1Title"),
            subtitle: t("onboarding.slide1Subtitle"),
        },
        {
            key: "convite",
            kind: "custom",
            visual: InviteMock,
            title: t("onboarding.slide2Title"),
            subtitle: t("onboarding.slide2Subtitle"),
        },
        {
            key: "registro",
            kind: "custom",
            visual: RegisterMock,
            title: t("onboarding.slide3Title"),
            subtitle: t("onboarding.slide3Subtitle"),
        },
        {
            key: "periodo",
            kind: "custom",
            visual: PeriodMock,
            title: t("onboarding.slide4Title"),
            subtitle: t("onboarding.slide4Subtitle"),
        },
        {
            key: "navegacao",
            kind: "custom",
            visual: TopBarMock,
            title: t("onboarding.slide5Title"),
            subtitle: t("onboarding.slide5Subtitle"),
        },
        {
            key: "ranking",
            kind: "custom",
            visual: RankingMock,
            title: t("onboarding.slide6Title"),
            subtitle: t("onboarding.slide6Subtitle"),
        },
    ];
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
    onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
    const { t } = useTranslation();
    const SLIDES = getSlides(t);
    const [currentIndex, setCurrentIndex] = useState(0);
    const listRef = useRef<FlatList<Slide>>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const isLast = currentIndex === SLIDES.length - 1;

    async function finish() {
        await AsyncStorage.setItem(ONBOARDING_KEY, "true");
        onDone();
    }

    function goNext() {
        if (isLast) {
            finish();
            return;
        }
        const next = currentIndex + 1;
        listRef.current?.scrollToIndex({ index: next, animated: true });
        setCurrentIndex(next);
    }

    const onMomentumScrollEnd = useCallback((e: any) => {
        const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setCurrentIndex(index);
    }, []);

    function renderSlide({ item }: ListRenderItemInfo<Slide>) {
        return (
            <View style={styles.slide}>
                {item.kind === "image" ? (
                    <Image source={item.image} style={styles.image} />
                ) : (
                    <item.visual />
                )}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.root}>
            <StatusBar style="light" />

            {/* Skip */}
            <View style={styles.header}>
                {!isLast ? (
                    <TouchableOpacity
                        onPress={finish}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <Text style={styles.skipText}>{t("common.skip")}</Text>
                    </TouchableOpacity>
                ) : (
                    <View />
                )}
            </View>

            {/* Slides */}
            <FlatList
                ref={listRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(s) => s.key}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false },
                )}
                onMomentumScrollEnd={onMomentumScrollEnd}
                style={styles.list}
                bounces={false}
            />

            {/* Footer */}
            <View style={styles.footer}>
                <View style={styles.dots}>
                    {SLIDES.map((s, i) => {
                        const width = scrollX.interpolate({
                            inputRange: [
                                (i - 1) * SCREEN_WIDTH,
                                i * SCREEN_WIDTH,
                                (i + 1) * SCREEN_WIDTH,
                            ],
                            outputRange: [8, 24, 8],
                            extrapolate: "clamp",
                        });
                        const backgroundColor = scrollX.interpolate({
                            inputRange: [
                                (i - 1) * SCREEN_WIDTH,
                                i * SCREEN_WIDTH,
                                (i + 1) * SCREEN_WIDTH,
                            ],
                            outputRange: [
                                COLORS.border,
                                COLORS.red,
                                COLORS.border,
                            ],
                            extrapolate: "clamp",
                        });
                        return (
                            <Animated.View
                                key={s.key}
                                style={[styles.dot, { width, backgroundColor }]}
                            />
                        );
                    })}
                </View>

                <TouchableOpacity style={styles.btn} onPress={goNext}>
                    <Text style={styles.btnText}>
                        {isLast ? t("common.start") : t("common.next")}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        height: 48,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
    },
    skipText: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 14,
        color: COLORS.textMuted,
    },
    list: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 36,
    },
    image: {
        width: 180,
        height: 180,
        resizeMode: "contain",
        marginBottom: 40,
    },
    title: {
        fontFamily: "Bungee_400Regular",
        fontSize: 30,
        color: COLORS.text,
        textAlign: "center",
        lineHeight: 38,
        marginBottom: 20,
    },
    subtitle: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 15,
        color: COLORS.textMuted,
        textAlign: "center",
        lineHeight: 26,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        gap: 24,
        alignItems: "center",
    },
    dots: {
        flexDirection: "row",
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    dotActive: {
        backgroundColor: COLORS.red,
        width: 24,
    },
    btn: {
        width: "100%",
        backgroundColor: COLORS.red,
        borderRadius: 10,
        padding: 18,
        alignItems: "center",
    },
    btnText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 16,
        color: "#fff",
    },
});
