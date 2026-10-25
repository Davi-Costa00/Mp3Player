import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView } from "react-native-safe-area-context";

const STORAGE_KEY = "player-de-musica-native";

const DEFAULT_SETTINGS = {
  autoAdvance: true,
  shuffle: false,
  lightMode: false,
};

const DARK = {
  background: "#090b12",
  surface: "#15141d",
  surfaceRaised: "#201e2b",
  border: "#343144",
  text: "#f7f5ff",
  muted: "#aaa6b8",
  accent: "#a98cff",
  accentStrong: "#c5b4ff",
  header: "#11121a",
  danger: "#ee8292",
};

const LIGHT = {
  background: "#f7f5f0",
  surface: "#fffdf9",
  surfaceRaised: "#f1ede6",
  border: "#ded8ce",
  text: "#292638",
  muted: "#706d78",
  accent: "#438bb9",
  accentStrong: "#70b5df",
  header: "#fffdf8",
  danger: "#bd4258",
};

const BUILT_IN_PLAYLISTS = [
  {
    id: "all",
    name: "Todas as músicas",
    description: "Sua biblioteca completa em ordem alfabética.",
  },
  {
    id: "recent",
    name: "Adicionadas recentemente",
    description: "Ouça primeiro as músicas que você adicionou por último.",
  },
];

const MP3_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/x-mpeg",
  "audio/x-mp3",
  "audio/mpeg3",
  "audio/x-mpeg-3",
]);

function isValidId(value) {
  return (
    (typeof value === "string" && value.length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function normalizeSongs(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (song) =>
        song &&
        typeof song === "object" &&
        isValidId(song.id) &&
        typeof song.uri === "string" &&
        song.uri.length > 0 &&
        typeof song.name === "string" &&
        song.name.length > 0,
    )
    .map((song) => ({
      ...song,
      id: String(song.id),
      displayName:
        typeof song.displayName === "string"
          ? song.displayName
          : song.name.replace(/\.mp3$/i, ""),
      addedAt: Number.isFinite(song.addedAt) ? song.addedAt : 0,
    }));
}

function normalizePlaylists(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (playlist) =>
        playlist &&
        typeof playlist === "object" &&
        isValidId(playlist.id) &&
        typeof playlist.name === "string" &&
        playlist.name.trim().length > 0,
    )
    .map((playlist) => ({
      ...playlist,
      id: String(playlist.id),
      songIds: Array.isArray(playlist.songIds)
        ? playlist.songIds.filter(isValidId).map(String)
        : [],
    }));
}

function formatTime(milliseconds = 0) {
  const totalSeconds = Math.floor(Math.max(milliseconds, 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function createStyles(colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      minHeight: 68,
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: colors.header,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 12 },
    brandMark: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    brandTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceRaised,
    },
    content: { padding: 20, paddingBottom: 28, gap: 18 },
    intro: { gap: 6, marginBottom: 2 },
    heading: { color: colors.text, fontSize: 25, fontWeight: "700" },
    subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
      gap: 14,
    },
    playlistCard: { minHeight: 168 },
    cardTop: { flexDirection: "row", alignItems: "center", gap: 13 },
    artwork: {
      width: 58,
      height: 58,
      borderRadius: 18,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    artworkLarge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      marginBottom: 3,
    },
    cardText: { flex: 1, gap: 5 },
    cardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    cardDescription: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    cardCount: { color: colors.muted, fontSize: 12, fontWeight: "600" },
    cardActions: { flexDirection: "row", alignItems: "center", gap: 9 },
    primaryButton: {
      minHeight: 44,
      borderRadius: 13,
      backgroundColor: colors.accent,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      flex: 1,
    },
    primaryButtonText: { color: "#171323", fontSize: 14, fontWeight: "700" },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    addCard: {
      minHeight: 104,
      padding: 18,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 10,
      backgroundColor: colors.surface,
    },
    addCardText: { color: colors.text, fontWeight: "700", fontSize: 15 },
    songCard: { minHeight: 134 },
    currentSongCard: { borderColor: colors.accent },
    songHeader: { flexDirection: "row", gap: 12, alignItems: "center" },
    songMain: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      flex: 1,
    },
    songArtwork: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    songName: { color: colors.text, fontSize: 15, fontWeight: "700" },
    songSubtext: { color: colors.muted, fontSize: 12, marginTop: 4 },
    emptyState: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: 24,
      gap: 10,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    emptyText: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    backButton: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingVertical: 5,
    },
    backText: { color: colors.accentStrong, fontWeight: "600", fontSize: 14 },
    status: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      marginHorizontal: 20,
      marginBottom: 8,
    },
    playerBar: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.header,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 5 : 10,
      gap: 10,
    },
    playerTrack: { flexDirection: "row", alignItems: "center", gap: 10 },
    miniArtwork: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.surfaceRaised,
      alignItems: "center",
      justifyContent: "center",
    },
    nowPlayingLabel: { color: colors.muted, fontSize: 10, marginBottom: 2 },
    nowPlayingName: { color: colors.text, fontSize: 13, fontWeight: "600" },
    playerControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    },
    playButton: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: colors.accentStrong,
      alignItems: "center",
      justifyContent: "center",
    },
    disabledPlayButton: { opacity: 0.55 },
    progressTouchArea: {
      height: 28,
      marginVertical: -11.5,
      justifyContent: "center",
      position: "relative",
    },
    progressTrack: {
      height: 5,
      borderRadius: 4,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    progressFill: {
      width: "100%",
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    progressThumb: {
      position: "absolute",
      left: 0,
      top: 8,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.background,
      backgroundColor: colors.accent,
    },
    playerTimes: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 5,
    },
    timeText: { color: colors.muted, fontSize: 10 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.62)",
      justifyContent: "center",
      padding: 22,
    },
    modalCard: {
      padding: 20,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      gap: 16,
    },
    modalTitle: { color: colors.text, fontSize: 20, fontWeight: "700" },
    input: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 13,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
      fontSize: 15,
    },
    settingRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    settingText: { color: colors.text, fontSize: 14, fontWeight: "600" },
    settingDetail: { color: colors.muted, fontSize: 12, marginTop: 4 },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    modalActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
    modalActionButton: {
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surfaceRaised,
    },
    modalActionPrimary: { backgroundColor: colors.accent },
    modalActionText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    modalActionPrimaryText: { color: "#171323" },
  });
}

function ProgressSlider({ progress, durationMillis, onSeek, styles }) {
  const [width, setWidth] = useState(0);
  const [dragProgress, setDragProgress] = useState(null);
  const dragStartXRef = useRef(0);
  const dragStartProgressRef = useRef(0);
  const dragProgressRef = useRef(0);
  const currentProgress = Math.min(Math.max(progress, 0), 1);
  const displayedProgress = dragProgress ?? currentProgress;

  return (
    <View
      accessibilityLabel="Avançar ou retroceder na música"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={(event) => {
        if (!durationMillis || !width) return false;
        return Math.abs(event.nativeEvent.locationX - currentProgress * width) <= 18;
      }}
      onResponderGrant={(event) => {
        dragStartXRef.current = event.nativeEvent.locationX;
        dragStartProgressRef.current = currentProgress;
        dragProgressRef.current = currentProgress;
        setDragProgress(currentProgress);
      }}
      onResponderMove={(event) => {
        if (!width) return;
        const nextProgress = Math.min(
          Math.max(
            dragStartProgressRef.current +
              (event.nativeEvent.locationX - dragStartXRef.current) / width,
            0,
          ),
          1,
        );
        dragProgressRef.current = nextProgress;
        setDragProgress(nextProgress);
      }}
      onResponderRelease={async () => {
        const nextProgress = dragProgressRef.current;
        await onSeek(nextProgress, durationMillis);
        setDragProgress(null);
      }}
      onResponderTerminate={() => setDragProgress(null)}
      onResponderTerminationRequest={() => false}
      style={styles.progressTouchArea}
    >
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${displayedProgress * 100}%` },
          ]}
        />
      </View>
      <View
        style={[
          styles.progressThumb,
          { left: `${displayedProgress * 100}%`, marginLeft: -6 },
        ]}
      />
    </View>
  );
}

export default function App() {
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [playback, setPlayback] = useState({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nameDialog, setNameDialog] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [status, setStatus] = useState("");
  const [finishedPlayback, setFinishedPlayback] = useState(null);
  const volumeRef = useRef(1);
  const soundRef = useRef(null);
  const playbackStatusSubscriptionRef = useRef(null);
  const currentSongRef = useRef(currentSong);
  const currentQueueRef = useRef([]);
  const settingsRef = useRef(settings);
  const styles = useMemo(
    () => createStyles(settings.lightMode ? LIGHT : DARK),
    [settings.lightMode],
  );
  const colors = settings.lightMode ? LIGHT : DARK;

  const customPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === activePlaylistId) || null,
    [playlists, activePlaylistId],
  );

  const playlistSongs = useMemo(() => {
    if (activePlaylistId === "recent") {
      return [...songs].sort(
        (a, b) =>
          b.addedAt - a.addedAt ||
          (a.displayName || a.name).localeCompare(
            b.displayName || b.name,
            "pt-BR",
          ),
      );
    }
    if (customPlaylist) {
      const songsById = new Map(songs.map((song) => [String(song.id), song]));
      return (customPlaylist.songIds || [])
        .map((id) => songsById.get(String(id)))
        .filter(Boolean);
    }
    return [...songs].sort((a, b) =>
      (a.displayName || a.name).localeCompare(
        b.displayName || b.name,
        "pt-BR",
      ),
    );
  }, [activePlaylistId, customPlaylist, songs]);

  useEffect(() => {
    currentQueueRef.current = playlistSongs;
  }, [activePlaylistId, playlistSongs]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: "doNotMix",
        });
      } catch (error) {
        if (mounted) {
          setStatus(`Não foi possível configurar o áudio: ${error.message}`);
        }
      }
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && mounted) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed.songs)) {
              const normalizedSongs = normalizeSongs(parsed.songs);
              setSongs(normalizedSongs);
              if (normalizedSongs.length !== parsed.songs.length) {
                setStatus("Algumas músicas salvas estavam inválidas e foram ignoradas.");
              }
            }
            if (Array.isArray(parsed.playlists)) {
              const normalizedPlaylists = normalizePlaylists(parsed.playlists);
              setPlaylists(normalizedPlaylists);
              if (normalizedPlaylists.length !== parsed.playlists.length) {
                setStatus("Algumas playlists salvas estavam inválidas e foram ignoradas.");
              }
            }
            if (parsed.settings && typeof parsed.settings === "object") {
              const savedSettings = parsed.settings;
              const autoAdvance =
                typeof savedSettings.autoAdvance === "boolean"
                  ? savedSettings.autoAdvance
                  : DEFAULT_SETTINGS.autoAdvance;
              setSettings({
                ...DEFAULT_SETTINGS,
                autoAdvance,
                shuffle: savedSettings.shuffle === true && !autoAdvance,
                lightMode:
                  typeof savedSettings.lightMode === "boolean"
                    ? savedSettings.lightMode
                    : DEFAULT_SETTINGS.lightMode,
              });
            }
          }
        }
      } catch (error) {
        if (mounted) {
          setStatus(`Não foi possível carregar os dados salvos: ${error.message}`);
        }
      } finally {
        if (mounted) setIsReady(true);
      }
    }

    loadData();
    return () => {
      mounted = false;
      playbackStatusSubscriptionRef.current?.remove();
      playbackStatusSubscriptionRef.current = null;
      if (soundRef.current) {
        try {
          soundRef.current.setActiveForLockScreen(false);
          soundRef.current.pause();
          soundRef.current.remove();
        } catch (error) {
          console.warn("Não foi possível liberar o áudio:", error);
        }
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ songs, playlists, settings }),
    ).catch((error) => {
      setStatus(`Não foi possível salvar os dados: ${error.message}`);
    });
  }, [isReady, songs, playlists, settings]);

  const handlePlaybackStatus = useCallback((playbackStatus) => {
    if (!playbackStatus.isLoaded) return;
    setPlayback({
      isPlaying: playbackStatus.playing,
      positionMillis: (playbackStatus.currentTime || 0) * 1000,
      durationMillis: (playbackStatus.duration || 0) * 1000,
    });
    if (playbackStatus.didJustFinish) {
      const finishedSong = currentSongRef.current;
      if (finishedSong) setFinishedPlayback({ songId: finishedSong.id });
    }
  }, []);

  const playSong = useCallback(
    async (song) => {
      try {
        let player = soundRef.current;
        if (player) {
          player.pause();
          player.replace({ uri: song.uri });
        } else {
          player = createAudioPlayer(
            { uri: song.uri },
            { updateInterval: 500, volume: volumeRef.current },
          );
          soundRef.current = player;
          playbackStatusSubscriptionRef.current = player.addListener(
            "playbackStatusUpdate",
            (playbackStatus) => {
              if (soundRef.current === player) {
                handlePlaybackStatus(playbackStatus);
              }
            },
          );
        }
        currentSongRef.current = song;
        setCurrentSong(song);
        setPlayback({ isPlaying: false, positionMillis: 0, durationMillis: 0 });
        player.setActiveForLockScreen(true, {
          title: song.displayName || song.name,
        });
        player.play();
        setStatus("");
      } catch (error) {
        setStatus(`Não foi possível reproduzir "${song.displayName || song.name}": ${error.message}`);
      }
    },
    [handlePlaybackStatus],
  );

  useEffect(() => {
    if (!finishedPlayback) return;
    const finishedSongId = finishedPlayback.songId;
    const currentSettings = settingsRef.current;
    if (!currentSettings.autoAdvance && !currentSettings.shuffle) return;
    const queue = currentQueueRef.current;
    const currentIndex = queue.findIndex(
      (song) => song.id === finishedSongId,
    );
    if (queue.length > 1) {
      const nextIndex = currentSettings.shuffle
        ? Math.floor(Math.random() * queue.length)
        : (Math.max(currentIndex, 0) + 1) % queue.length;
      const nextSong = queue[nextIndex];
      if (nextSong && nextSong.id !== finishedSongId) {
        playSong(nextSong);
      }
    }
  }, [finishedPlayback, playSong]);

  const togglePlayback = useCallback(async () => {
    if (!currentSong) return;
    try {
      if (!soundRef.current) {
        await playSong(currentSong);
      } else if (playback.isPlaying) {
        soundRef.current.pause();
      } else {
        soundRef.current.play();
      }
    } catch (error) {
      setStatus(`Não foi possível controlar a reprodução: ${error.message}`);
    }
  }, [currentSong, playback.isPlaying, playSong]);

  const skipSong = useCallback(
    async (direction) => {
      const queue = currentQueueRef.current;
      if (!queue.length) return;
      const index = queue.findIndex((song) => song.id === currentSong?.id);
      let nextIndex;
      if (settingsRef.current.shuffle && queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * queue.length);
        } while (nextIndex === index);
      } else {
        nextIndex = (Math.max(index, 0) + direction + queue.length) % queue.length;
      }
      const target = queue[nextIndex];
      if (target) await playSong(target);
    },
    [currentSong, playSong],
  );

  const setPlayerSetting = useCallback((key, value) => {
    setSettings((previous) => {
      const next = { ...previous, [key]: value };
      if (key === "autoAdvance" && value) next.shuffle = false;
      if (key === "shuffle" && value) next.autoAdvance = false;
      return next;
    });
  }, []);

  const openPlaylist = (playlistId) => {
    setActivePlaylistId(playlistId);
    setStatus("");
  };

  const savePlaylistName = () => {
    const nextName = nameInput.trim();
    if (!nextName) {
      setStatus("Digite um nome para a playlist.");
      return;
    }
    const duplicate = [
      ...BUILT_IN_PLAYLISTS,
      ...playlists.filter(
        (playlist) => playlist.id !== nameDialog?.playlistId,
      ),
    ].some((playlist) => playlist.name.toLocaleLowerCase("pt-BR") === nextName.toLocaleLowerCase("pt-BR"));
    if (duplicate) {
      setStatus("Já existe uma playlist com esse nome.");
      return;
    }

    if (nameDialog?.mode === "rename") {
      setPlaylists((previous) =>
        previous.map((playlist) =>
          playlist.id === nameDialog.playlistId
            ? { ...playlist, name: nextName }
            : playlist,
        ),
      );
    } else {
      const playlist = {
        id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: nextName,
        songIds: [],
        createdAt: Date.now(),
      };
      setPlaylists((previous) => [...previous, playlist]);
      setStatus(`Playlist "${nextName}" criada.`);
    }
    setNameDialog(null);
    setNameInput("");
  };

  const createPlaylist = () => {
    let name = "Nova playlist";
    let suffix = 2;
    while (
      [...BUILT_IN_PLAYLISTS, ...playlists].some(
        (playlist) => playlist.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
      )
    ) {
      name = `Nova playlist ${suffix}`;
      suffix += 1;
    }
    setNameInput(name);
    setNameDialog({ mode: "create" });
  };

  const removePlaylist = (playlist) => {
    Alert.alert("Remover playlist", `Deseja remover "${playlist.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          setPlaylists((previous) =>
            previous.filter((item) => item.id !== playlist.id),
          );
          if (activePlaylistId === playlist.id) setActivePlaylistId(null);
          setStatus(`A playlist "${playlist.name}" foi removida.`);
        },
      },
    ]);
  };

  const importSongs = async () => {
    const copiedUris = [];
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const selectedFiles = result.assets.filter((file) => {
        const mimeType = file.mimeType?.split(";")[0].trim().toLowerCase();
        return (
          /\.mp3$/i.test(file.name || "") ||
          (mimeType ? MP3_MIME_TYPES.has(mimeType) : false)
        );
      });
      if (!selectedFiles.length) {
        setStatus("Selecione arquivos MP3 para adicionar à biblioteca.");
        return;
      }
      if (!FileSystem.documentDirectory) {
        throw new Error("O armazenamento local não está disponível neste dispositivo.");
      }
      const importedSongs = [];
      for (const file of selectedFiles) {
        const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const localUri = `${FileSystem.documentDirectory}${id}.mp3`;
        const fileName = /\.mp3$/i.test(file.name)
          ? file.name
          : `${file.name}.mp3`;
        await FileSystem.copyAsync({ from: file.uri, to: localUri });
        copiedUris.push(localUri);
        importedSongs.push({
          id,
          name: fileName,
          displayName: fileName.replace(/\.mp3$/i, ""),
          uri: localUri,
          addedAt: Date.now(),
        });
      }
      setSongs((previous) => [...previous, ...importedSongs]);
      if (customPlaylist) {
        const addedIds = importedSongs.map((song) => song.id);
        setPlaylists((previous) =>
          previous.map((playlist) =>
            playlist.id === customPlaylist.id
              ? {
                  ...playlist,
                  songIds: [...new Set([...(playlist.songIds || []), ...addedIds])],
                }
              : playlist,
          ),
        );
      }
      setStatus(
        `${importedSongs.length} ${importedSongs.length === 1 ? "música adicionada" : "músicas adicionadas"}${customPlaylist ? " à playlist." : " à biblioteca."}`,
      );
    } catch (error) {
      const cleanupErrors = [];
      await Promise.all(
        copiedUris.map((uri) =>
          FileSystem.deleteAsync(uri, { idempotent: true }).catch((cleanupError) => {
            cleanupErrors.push(cleanupError.message);
          }),
        ),
      );
      const cleanupMessage = cleanupErrors.length
        ? ` Arquivos temporários não removidos: ${cleanupErrors.join("; ")}`
        : "";
      setStatus(`Não foi possível importar as músicas: ${error.message}.${cleanupMessage}`);
    }
  };

  const removeSong = (song) => {
    if (customPlaylist) {
      Alert.alert(
        "Remover da playlist",
        `Deseja remover "${song.displayName || song.name}" desta playlist?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Remover",
            style: "destructive",
            onPress: () => {
              setPlaylists((previous) =>
                previous.map((playlist) =>
                  playlist.id === customPlaylist.id
                    ? {
                        ...playlist,
                        songIds: playlist.songIds.filter(
                          (id) => String(id) !== String(song.id),
                        ),
                      }
                    : playlist,
                ),
              );
              setStatus("A música foi removida desta playlist.");
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      "Remover música",
      `Deseja remover "${song.displayName || song.name}" da biblioteca?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              const activeSong = currentSongRef.current;
              const isActiveSong =
                activeSong &&
                (String(activeSong.id) === String(song.id) ||
                  activeSong.uri === song.uri);
              if (isActiveSong && soundRef.current) {
                const player = soundRef.current;
                soundRef.current = null;
                playbackStatusSubscriptionRef.current?.remove();
                playbackStatusSubscriptionRef.current = null;
                player.setActiveForLockScreen(false);
                currentSongRef.current = null;
                setCurrentSong(null);
                setPlayback({ isPlaying: false, positionMillis: 0, durationMillis: 0 });
                try {
                  player.pause();
                } finally {
                  player.remove();
                }
              }
              await FileSystem.deleteAsync(song.uri, { idempotent: true });
            } catch (error) {
              setStatus(`Não foi possível remover o arquivo da música: ${error.message}`);
              return;
            }
            setSongs((previous) => previous.filter((item) => item.id !== song.id));
            setPlaylists((previous) =>
              previous.map((playlist) => ({
                ...playlist,
                songIds: (playlist.songIds || []).filter(
                  (id) => String(id) !== String(song.id),
                ),
              })),
            );
            setStatus("A música foi removida da biblioteca.");
          },
        },
      ],
    );
  };

  const renameSong = (song) => {
    setNameInput(song.displayName || song.name.replace(/\.mp3$/i, ""));
    setNameDialog({ mode: "renameSong", songId: song.id });
  };

  const saveSongName = () => {
    const nextName = nameInput.trim();
    if (!nextName) {
      setStatus("Digite um nome para a música.");
      return;
    }
    setSongs((previous) =>
      previous.map((song) =>
        song.id === nameDialog?.songId
          ? { ...song, displayName: nextName }
          : song,
      ),
    );
    if (currentSong?.id === nameDialog?.songId) {
      setCurrentSong((previous) => {
        const renamed = { ...previous, displayName: nextName };
        currentSongRef.current = renamed;
        return renamed;
      });
    }
    setNameDialog(null);
    setNameInput("");
  };

  const seekToProgress = useCallback(async (ratio, durationMillis) => {
    const sound = soundRef.current;
    if (!sound || !durationMillis) return;
    try {
      await sound.seekTo((ratio * durationMillis) / 1000);
    } catch (error) {
      setStatus(`Não foi possível alterar a posição da música: ${error.message}`);
    }
  }, []);

  const currentTitle = currentSong
    ? currentSong.displayName || currentSong.name
    : "Selecione uma música";
  const progress = playback.durationMillis
    ? playback.positionMillis / playback.durationMillis
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={settings.lightMode ? "dark-content" : "light-content"}
        backgroundColor={colors.header}
      />
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <Ionicons name="musical-notes" size={22} color="#fff" />
            </View>
            <Text style={styles.brandTitle}>SportiFree</Text>
          </View>
          <Pressable
            accessibilityLabel="Abrir configurações"
            onPress={() => setSettingsOpen(true)}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={22} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {!activePlaylistId ? (
            <>
              <View style={styles.intro}>
                <Text style={styles.heading}>Suas playlists</Text>
                <Text style={styles.subtitle}>
                  Escolha uma playlist para começar a ouvir.
                </Text>
              </View>
              {BUILT_IN_PLAYLISTS.map((playlist) => {
                const count = playlist.id === "all" || playlist.id === "recent"
                  ? songs.length
                  : 0;
                return (
                  <View key={playlist.id} style={[styles.card, styles.playlistCard]}>
                    <View style={styles.cardTop}>
                      <View style={styles.artwork}>
                        <Ionicons
                          name={playlist.id === "recent" ? "time-outline" : "musical-notes"}
                          size={27}
                          color={colors.accent}
                        />
                      </View>
                      <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>{playlist.name}</Text>
                        <Text style={styles.cardDescription}>{playlist.description}</Text>
                        <Text style={styles.cardCount}>
                          {count} {count === 1 ? "música" : "músicas"}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openPlaylist(playlist.id)}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Abrir playlist</Text>
                      <Ionicons name="arrow-forward" size={17} color="#171323" />
                    </Pressable>
                  </View>
                );
              })}
              {playlists.map((playlist) => (
                <View key={playlist.id} style={[styles.card, styles.playlistCard]}>
                  <View style={styles.cardTop}>
                    <View style={styles.artwork}>
                      <Ionicons name="musical-note" size={27} color={colors.accent} />
                    </View>
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle}>{playlist.name}</Text>
                      <Text style={styles.cardDescription}>
                        Sua playlist personalizada.
                      </Text>
                      <Text style={styles.cardCount}>
                        {(playlist.songIds || []).filter((id) =>
                          songs.some((song) => String(song.id) === String(id)),
                        ).length}{" "}
                        {(playlist.songIds || []).length === 1 ? "música" : "músicas"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => openPlaylist(playlist.id)}
                      style={styles.primaryButton}
                    >
                      <Text style={styles.primaryButtonText}>Abrir playlist</Text>
                      <Ionicons name="arrow-forward" size={17} color="#171323" />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Renomear ${playlist.name}`}
                      onPress={() => {
                        setNameInput(playlist.name);
                        setNameDialog({ mode: "rename", playlistId: playlist.id });
                      }}
                      style={styles.iconButton}
                    >
                      <Ionicons name="pencil-outline" size={18} color={colors.text} />
                    </Pressable>
                    <Pressable
                      accessibilityLabel={`Remover ${playlist.name}`}
                      onPress={() => removePlaylist(playlist)}
                      style={styles.iconButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
              <Pressable onPress={createPlaylist} style={styles.addCard}>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
                <Text style={styles.addCardText}>Nova playlist</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  setActivePlaylistId(null);
                  setStatus("");
                }}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={18} color={colors.accentStrong} />
                <Text style={styles.backText}>Voltar às playlists</Text>
              </Pressable>
              <View style={styles.intro}>
                <Text style={styles.heading}>
                  {customPlaylist?.name ||
                    BUILT_IN_PLAYLISTS.find((playlist) => playlist.id === activePlaylistId)?.name ||
                    "Suas músicas"}
                </Text>
                <Text style={styles.subtitle}>
                  {playlistSongs.length} {playlistSongs.length === 1 ? "música" : "músicas"}
                </Text>
              </View>
              {playlistSongs.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <View
                    key={song.id}
                    style={[
                      styles.card,
                      styles.songCard,
                      isCurrent && styles.currentSongCard,
                    ]}
                  >
                    <View style={styles.songHeader}>
                      <Pressable
                        onPress={() => playSong(song)}
                        style={styles.songMain}
                      >
                        <View style={styles.songArtwork}>
                          <Ionicons
                            name={isCurrent && playback.isPlaying ? "volume-high" : "musical-note"}
                            size={23}
                            color={colors.accent}
                          />
                        </View>
                        <View style={styles.cardText}>
                          <Text numberOfLines={2} style={styles.songName}>
                            {song.displayName || song.name}
                          </Text>
                          <Text numberOfLines={1} style={styles.songSubtext}>
                            {isCurrent && playback.isPlaying ? "Tocando agora" : "Arquivo MP3"}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Renomear ${song.displayName || song.name}`}
                        onPress={() => renameSong(song)}
                        hitSlop={6}
                        style={styles.iconButton}
                      >
                        <Ionicons name="pencil-outline" size={17} color={colors.muted} />
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Remover ${song.displayName || song.name}`}
                        onPress={() => removeSong(song)}
                        hitSlop={6}
                        style={styles.iconButton}
                      >
                        <Ionicons name="trash-outline" size={17} color={colors.danger} />
                      </Pressable>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable
                        onPress={() => (isCurrent ? togglePlayback() : playSong(song))}
                        style={styles.primaryButton}
                      >
                        <Ionicons
                          name={isCurrent && playback.isPlaying ? "pause" : "play"}
                          size={17}
                          color="#171323"
                        />
                        <Text style={styles.primaryButtonText}>
                          {isCurrent && playback.isPlaying ? "Pausar" : "Reproduzir"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
              {!playlistSongs.length && (
                <View style={styles.emptyState}>
                  <View style={styles.artworkLarge}>
                    <Ionicons name="musical-notes" size={34} color="#fff" />
                  </View>
                  <Text style={styles.emptyTitle}>Sua playlist está vazia</Text>
                  <Text style={styles.emptyText}>
                    Adicione arquivos MP3 para começar a ouvir suas músicas aqui.
                  </Text>
                </View>
              )}
              <Pressable onPress={importSongs} style={styles.addCard}>
                <Ionicons name="add-circle" size={26} color={colors.accent} />
                <Text style={styles.addCardText}>Adicionar músicas MP3</Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {!!status && <Text accessibilityRole="alert" style={styles.status}>{status}</Text>}

        <View style={styles.playerBar}>
          <View style={styles.playerTrack}>
            <View style={styles.miniArtwork}>
              <Ionicons name="musical-notes" size={20} color={colors.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.nowPlayingLabel}>TOCANDO AGORA</Text>
              <Text numberOfLines={1} style={styles.nowPlayingName}>{currentTitle}</Text>
            </View>
          </View>
          <View style={styles.playerControls}>
            <Pressable
              accessibilityLabel="Música anterior"
              disabled={!currentSong}
              onPress={() => skipSong(-1)}
              hitSlop={8}
            >
              <Ionicons
                name="play-skip-back"
                size={21}
                color={currentSong ? colors.text : colors.muted}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={playback.isPlaying ? "Pausar música" : "Reproduzir música"}
              disabled={!currentSong}
              onPress={togglePlayback}
              style={[styles.playButton, !currentSong && styles.disabledPlayButton]}
            >
              <Ionicons
                name={playback.isPlaying ? "pause" : "play"}
                size={23}
                color="#272039"
              />
            </Pressable>
            <Pressable
              accessibilityLabel="Próxima música"
              disabled={!currentSong}
              onPress={() => skipSong(1)}
              hitSlop={8}
            >
              <Ionicons
                name="play-skip-forward"
                size={21}
                color={currentSong ? colors.text : colors.muted}
              />
            </Pressable>
          </View>
          <ProgressSlider
            durationMillis={playback.durationMillis}
            onSeek={seekToProgress}
            progress={progress}
            styles={styles}
          />
          <View style={styles.playerTimes}>
            <Text style={styles.timeText}>{formatTime(playback.positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(playback.durationMillis)}</Text>
          </View>
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={settingsOpen}
        onRequestClose={() => setSettingsOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSettingsOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Configurações</Text>
            <Text style={styles.cardDescription}>
              Ajuste a reprodução e a aparência do player.
            </Text>
            {[
              {
                key: "autoAdvance",
                title: "Reprodução automática",
                detail: "Tocar outra faixa ao terminar",
              },
              {
                key: "shuffle",
                title: "Ordem aleatória",
                detail: "Escolher outra faixa aleatória",
              },
              {
                key: "lightMode",
                title: "Modo claro",
                detail: "Usar a interface clara",
              },
            ].map((setting, index) => (
              <React.Fragment key={setting.key}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.settingRow}>
                  <View style={styles.cardText}>
                    <Text style={styles.settingText}>{setting.title}</Text>
                    <Text style={styles.settingDetail}>{setting.detail}</Text>
                  </View>
                  <Switch
                    value={settings[setting.key]}
                    onValueChange={(value) => setPlayerSetting(setting.key, value)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor={settings.lightMode ? "#fff" : "#f7f5ff"}
                  />
                </View>
              </React.Fragment>
            ))}
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSettingsOpen(false)}
                style={[styles.modalActionButton, styles.modalActionPrimary]}
              >
                <Text style={[styles.modalActionText, styles.modalActionPrimaryText]}>
                  Concluir
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(nameDialog)}
        onRequestClose={() => {
          setNameDialog(null);
          setNameInput("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {nameDialog?.mode === "create"
                ? "Nova playlist"
                : nameDialog?.mode === "rename"
                  ? "Renomear playlist"
                  : "Renomear música"}
            </Text>
            <TextInput
              autoFocus
              onChangeText={setNameInput}
              onSubmitEditing={
                nameDialog?.mode === "renameSong" ? saveSongName : savePlaylistName
              }
              placeholder="Digite um nome"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              selectTextOnFocus
              style={styles.input}
              value={nameInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setNameDialog(null);
                  setNameInput("");
                }}
                style={styles.modalActionButton}
              >
                <Text style={styles.modalActionText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={
                  nameDialog?.mode === "renameSong" ? saveSongName : savePlaylistName
                }
                style={[styles.modalActionButton, styles.modalActionPrimary]}
              >
                <Text style={[styles.modalActionText, styles.modalActionPrimaryText]}>
                  Salvar
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
