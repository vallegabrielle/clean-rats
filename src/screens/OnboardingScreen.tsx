import { useRef, useState, useCallback, useEffect } from "react";
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

export const ONBOARDING_KEY = "@cleanrats:onboarding_done";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Mock visual: top bar + settings hint ────────────────────────────────────

function TopBarMock() {
    const items = [
        { value: "3", label: "membros" },
        { value: "8", label: "tarefas" },
        { value: "12", label: "atividades" },
        { value: "2", label: "histórico" },
    ];
    return (
        <View style={mock.wrapper}>
            {/* Header row */}
            <View style={mock.header}>
                <View style={mock.titleBlock}>
                    <View style={mock.titleLine} />
                    <View style={mock.subtitleLine} />
                </View>
                <View style={mock.headerActions}>
                    <View style={mock.iconBtn}>
                        <Text style={mock.iconBtnText}>···</Text>
                    </View>
                    <View style={mock.addBtn}>
                        <Text style={mock.addBtnText}>+</Text>
                    </View>
                </View>
            </View>

            {/* Top bar */}
            <View style={mock.topBar}>
                {items.map((item, i) => (
                    <View key={item.label} style={mock.topBarItem}>
                        <Text style={mock.topBarValue}>{item.value}</Text>
                        <Text style={mock.topBarLabel}>{item.label}</Text>
                        {i < items.length - 1 && <View style={mock.divider} />}
                    </View>
                ))}
            </View>
            {/* Tap hint */}
            <View style={mock.hint}>
                <Text style={mock.hintText}>
                    Toque em qualquer item para navegar
                </Text>
            </View>
        </View>
    );
}

// ─── Mock visual: código de convite ──────────────────────────────────────────

function InviteMock() {
    return (
        <View style={mock.wrapper}>
            {/* House name */}
            <View style={mock.inviteHeader}>
                <Text style={mock.inviteHouseName}>República das Ratas</Text>
                <Text style={mock.inviteSubtitle}>
                    Compartilhe o código com sua galera
                </Text>
            </View>

            {/* Code */}
            <View style={mock.codeBlock}>
                <Text style={mock.codeText}>RATA42</Text>
            </View>

            {/* Share button */}
            <View style={mock.shareBtn}>
                <Text style={mock.shareBtnText}>Compartilhar código</Text>
            </View>

            {/* Steps */}
            <View style={mock.inviteSteps}>
                {[
                    'Colega abre o app e toca em "Entrar com código"',
                    "Digita o código e entra na toca",
                ].map((step, i) => (
                    <View key={i} style={mock.inviteStep}>
                        <View style={mock.inviteStepDot}>
                            <Text style={mock.inviteStepDotText}>{i + 1}</Text>
                        </View>
                        <Text style={mock.inviteStepText}>{step}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

// ─── Mock visual: registro + swipe ───────────────────────────────────────────

const LOG_ENTRIES = [
    { name: "Ana", task: "Lavar louça", pts: 10, time: "08:14" },
    { name: "Você", task: "Varrer / Aspirar", pts: 15, time: "09:32", swiped: true },
    { name: "Bruno", task: "Tirar lixo", pts: 10, time: "11:05" },
];

const SWIPE_TO = -(56 + 4 + 56 + 6);

function RegisterMock() {
    const slideX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(900),
                Animated.timing(slideX, {
                    toValue: SWIPE_TO,
                    duration: 380,
                    useNativeDriver: true,
                }),
                Animated.delay(1400),
                Animated.timing(slideX, {
                    toValue: 0,
                    duration: 280,
                    useNativeDriver: true,
                }),
                Animated.delay(600),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View style={mock.feedWrapper}>
            {LOG_ENTRIES.map((entry, i) => (
                <View key={i} style={mock.logRowWrap}>
                    {entry.swiped && (
                        <View style={mock.swipeActions}>
                            <View style={mock.swipeEdit}>
                                <Text style={mock.swipeEditIcon}>✎</Text>
                            </View>
                            <View style={mock.swipeDelete}>
                                <Text style={mock.swipeDeleteIcon}>✕</Text>
                            </View>
                        </View>
                    )}
                    <Animated.View
                        style={[
                            mock.logRow,
                            entry.swiped && { transform: [{ translateX: slideX }] },
                        ]}
                    >
                        <View style={mock.logAvatar}>
                            <Text style={mock.logAvatarText}>{entry.name[0]}</Text>
                        </View>
                        <View style={mock.logInfo}>
                            <Text style={mock.logTask}>{entry.task}</Text>
                            <Text style={mock.logMeta}>{entry.name} · {entry.time}</Text>
                        </View>
                        <View style={mock.logPoints}>
                            <Text style={mock.logPointsValue}>{entry.pts}</Text>
                            <Text style={mock.logPointsLabel}>pts</Text>
                        </View>
                    </Animated.View>
                </View>
            ))}
            <View style={mock.swipeHint}>
                <Text style={mock.hintText}>← deslize para editar ou excluir</Text>
            </View>
        </View>
    );
}

// ─── Mock visual: período + prêmio ───────────────────────────────────────────

const PROGRESS = 0.42; // 13 de 31 dias

function PeriodMock() {
    return (
        <View style={mock.wrapper}>
            {/* Period type */}
            <View style={mock.periodHeader}>
                <View style={mock.periodBadge}>
                    <Text style={mock.periodBadgeText}>MENSAL</Text>
                </View>
                <Text style={mock.periodRemaining}>18 dias restantes</Text>
            </View>

            {/* Progress bar */}
            <View style={mock.progressTrack}>
                <View
                    style={[mock.progressFill, { width: `${PROGRESS * 100}%` }]}
                />
            </View>
            <View style={mock.progressLabels}>
                <Text style={mock.progressLabel}>1 Mar</Text>
                <Text style={mock.progressLabel}>31 Mar</Text>
            </View>

            {/* Prize */}
            <View style={mock.prizeRow}>
                <Text style={mock.prizeTrophy}>🏆</Text>
                <View style={mock.prizeInfo}>
                    <Text style={mock.prizeLabel}>PRÊMIO DO PERÍODO</Text>
                    <Text style={mock.prizeName}>Jantar especial</Text>
                </View>
            </View>

            {/* Hint */}
            <View style={mock.hint}>
                <Text style={mock.hintText}>
                    Ao final, o 1º lugar leva o prêmio
                </Text>
            </View>
        </View>
    );
}

// ─── Mock visual: ranking ─────────────────────────────────────────────────────

const RANKING_ENTRIES = [
    { initials: "AC", name: "Ana Costa", points: 185, tasks: 12, medal: "🥇" },
    { initials: "BR", name: "Bruno Ramos", points: 140, tasks: 9, medal: "🥈" },
    { initials: "CL", name: "Carol Lima", points: 95, tasks: 6, medal: "🥉" },
];

function RankingMock() {
    return (
        <View style={mock.wrapper}>
            <View style={mock.rankHeader}>
                <Text style={mock.rankTitle}>Ranking do período</Text>
                <Text style={mock.rankPeriod}>Mar 2026</Text>
            </View>
            {RANKING_ENTRIES.map((entry, i) => (
                <View
                    key={entry.name}
                    style={[
                        mock.rankRow,
                        i < RANKING_ENTRIES.length - 1 && mock.rankRowBorder,
                    ]}
                >
                    <Text style={mock.rankMedal}>{entry.medal}</Text>
                    <View style={mock.rankAvatar}>
                        <Text style={mock.rankAvatarText}>
                            {entry.initials}
                        </Text>
                    </View>
                    <View style={mock.rankInfo}>
                        <Text style={mock.rankName}>{entry.name}</Text>
                        <Text style={mock.rankMeta}>{entry.tasks} tarefas</Text>
                    </View>
                    <Text style={mock.rankPoints}>{entry.points} pts</Text>
                </View>
            ))}
        </View>
    );
}

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
    visual: () => JSX.Element;
    title: string;
    subtitle: string;
};

type Slide = ImageSlide | CustomSlide;

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES: Slide[] = [
    {
        key: "welcome",
        kind: "image",
        image: require("../../assets/cleaner_rat.png"),
        title: "Bem-vindo ao\nClean Rats",
        subtitle:
            "Transforme a divisão de tarefas\ndomésticas em uma competição\nsaudável com quem você mora!",
    },
    {
        key: "toca",
        kind: "image",
        image: require("../../assets/red_rat.png"),
        title: "Crie ou entre\nem uma toca",
        subtitle:
            "Una sua república, configure as\ntarefas e defina um prêmio para\nmotivar todo mundo.",
    },
    {
        key: "convite",
        kind: "custom",
        visual: InviteMock,
        title: "Chame sua\ngalera",
        subtitle:
            "Cada toca tem um código único.\nCompartilhe com quem vai dividir\nas tarefas com você.",
    },
    {
        key: "registro",
        kind: "custom",
        visual: RegisterMock,
        title: "Registre o que\nvocê fez",
        subtitle:
            "Marque tarefas concluídas e acumule\npontos. Deslize um registro para\neditar ou excluir.",
    },
    {
        key: "periodo",
        kind: "custom",
        visual: PeriodMock,
        title: "Ciclos e\nprêmios",
        subtitle:
            "Os pontos reiniciam a cada período.\nQuem terminar em 1º leva o prêmio\nque a toca definiu.",
    },
    {
        key: "navegacao",
        kind: "custom",
        visual: TopBarMock,
        title: "Tudo ao alcance\nde um toque",
        subtitle:
            'Os botões no topo levam para membros, tarefas, atividades e histórico.\n \nO "···" abre as configurações da toca.',
    },
    {
        key: "ranking",
        kind: "custom",
        visual: RankingMock,
        title: "Dispute o\nranking",
        subtitle:
            "Acompanhe quem está na frente e\nconsulte o histórico de períodos\npassados.",
    },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
    onDone: () => void;
};

export default function OnboardingScreen({ onDone }: Props) {
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
                        <Text style={styles.skipText}>Pular</Text>
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
                            extrapolate: 'clamp',
                        });
                        const backgroundColor = scrollX.interpolate({
                            inputRange: [
                                (i - 1) * SCREEN_WIDTH,
                                i * SCREEN_WIDTH,
                                (i + 1) * SCREEN_WIDTH,
                            ],
                            outputRange: [COLORS.border, COLORS.red, COLORS.border],
                            extrapolate: 'clamp',
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
                        {isLast ? "Começar" : "Próximo"}
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

// ─── Mock styles ──────────────────────────────────────────────────────────────

const mock = StyleSheet.create({
    wrapper: {
        width: "100%",
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: "hidden",
        marginBottom: 40,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    titleBlock: {
        gap: 6,
    },
    titleLine: {
        width: 100,
        height: 10,
        borderRadius: 4,
        backgroundColor: COLORS.surfaceAlt,
    },
    subtitleLine: {
        width: 60,
        height: 7,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
    },
    iconBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.red,
    },
    iconBtnText: {
        color: COLORS.red,
        fontSize: 14,
        fontFamily: "NotoSansMono_400Regular",
    },
    callout: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    calloutArrow: {
        color: COLORS.red,
        fontSize: 12,
        fontFamily: "NotoSansMono_400Regular",
    },
    calloutText: {
        color: COLORS.red,
        fontSize: 10,
        fontFamily: "NotoSansMono_400Regular",
    },
    addBtn: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: COLORS.red,
        alignItems: "center",
        justifyContent: "center",
    },
    addBtnText: {
        color: "#fff",
        fontSize: 18,
        lineHeight: 22,
    },
    topBar: {
        flexDirection: "row",
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    topBarItem: {
        flex: 1,
        alignItems: "center",
        gap: 4,
        position: "relative",
    },
    topBarValue: {
        fontFamily: "Bungee_400Regular",
        fontSize: 18,
        color: COLORS.text,
    },
    topBarLabel: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 10,
        color: COLORS.textMuted,
    },
    divider: {
        position: "absolute",
        right: 0,
        top: "15%",
        height: "70%",
        width: 1,
        backgroundColor: COLORS.border,
    },
    hint: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingVertical: 10,
        alignItems: "center",
    },
    hintText: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 11,
        color: COLORS.red,
    },
    rankHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rankTitle: {
        fontFamily: "Bungee_400Regular",
        fontSize: 13,
        color: COLORS.text,
    },
    rankPeriod: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 11,
        color: COLORS.textMuted,
    },
    rankRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    rankRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rankMedal: {
        fontSize: 18,
    },
    rankAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: COLORS.red,
        alignItems: "center",
        justifyContent: "center",
    },
    rankAvatarText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 11,
        color: "#fff",
    },
    rankInfo: {
        flex: 1,
        gap: 2,
    },
    rankName: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 13,
        color: COLORS.text,
    },
    rankMeta: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 11,
        color: COLORS.textMuted,
    },
    rankPoints: {
        fontFamily: "Bungee_400Regular",
        fontSize: 14,
        color: COLORS.red,
    },
    periodHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    periodBadge: {
        backgroundColor: COLORS.red,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    periodBadgeText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 11,
        color: "#fff",
        letterSpacing: 1,
    },
    periodRemaining: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 12,
        color: COLORS.textMuted,
    },
    progressTrack: {
        height: 6,
        backgroundColor: COLORS.surfaceAlt,
        marginHorizontal: 16,
        marginTop: 14,
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: COLORS.red,
        borderRadius: 3,
    },
    progressLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginHorizontal: 16,
        marginTop: 6,
        marginBottom: 4,
    },
    progressLabel: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 10,
        color: COLORS.textMuted,
    },
    prizeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginHorizontal: 16,
        marginVertical: 14,
        padding: 12,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    prizeTrophy: {
        fontSize: 28,
    },
    prizeInfo: {
        gap: 3,
    },
    prizeLabel: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 10,
        color: COLORS.textMuted,
        letterSpacing: 0.5,
    },
    prizeName: {
        fontFamily: "Bungee_400Regular",
        fontSize: 14,
        color: COLORS.text,
    },
    inviteHeader: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 4,
    },
    inviteHouseName: {
        fontFamily: "Bungee_400Regular",
        fontSize: 14,
        color: COLORS.text,
    },
    inviteSubtitle: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 11,
        color: COLORS.textMuted,
    },
    codeBlock: {
        marginHorizontal: 16,
        marginVertical: 14,
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 14,
        alignItems: "center",
    },
    codeText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 28,
        color: COLORS.red,
        letterSpacing: 6,
    },
    shareBtn: {
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingVertical: 11,
        alignItems: "center",
    },
    shareBtnText: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 13,
        color: COLORS.text,
    },
    inviteSteps: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
    },
    inviteStep: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    inviteStepDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: COLORS.red,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    inviteStepDotText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 11,
        color: "#fff",
    },
    inviteStepText: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 11,
        color: COLORS.textMuted,
        flex: 1,
    },
    feedWrapper: {
        width: "100%",
        gap: 8,
        marginBottom: 40,
    },
    logRowWrap: {
        borderRadius: 10,
        overflow: "hidden",
        position: "relative",
    },
    swipeActions: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        flexDirection: "row",
        paddingLeft: 6,
    },
    swipeEdit: {
        width: 56,
        backgroundColor: COLORS.surfaceAlt,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        marginRight: 4,
    },
    swipeEditIcon: {
        fontSize: 18,
        color: COLORS.textMuted,
    },
    swipeDelete: {
        width: 56,
        backgroundColor: COLORS.danger,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
    },
    swipeDeleteIcon: {
        fontSize: 16,
        color: "#fff",
    },
    logRow: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
    },
    logRowSwiped: {
        transform: [{ translateX: -(56 + 4 + 56 + 6) }],
    },
    logAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: COLORS.red,
        alignItems: "center",
        justifyContent: "center",
    },
    logAvatarText: {
        fontFamily: "Bungee_400Regular",
        fontSize: 13,
        color: "#fff",
    },
    logInfo: {
        flex: 1,
        gap: 3,
    },
    logTask: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 15,
        color: COLORS.text,
    },
    logMeta: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 12,
        color: COLORS.textMuted,
    },
    logPoints: {
        backgroundColor: COLORS.surfaceAlt,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignItems: "center",
        minWidth: 48,
    },
    logPointsValue: {
        fontFamily: "Bungee_400Regular",
        fontSize: 16,
        color: COLORS.red,
    },
    logPointsLabel: {
        fontFamily: "NotoSansMono_400Regular",
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    swipeHint: {
        alignItems: "center",
        paddingTop: 4,
    },
});
