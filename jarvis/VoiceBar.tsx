"use client";
import { CalendarClock, Newspaper, Square } from "lucide-react";
import styles from "./jarvis.module.css";
import type { VoiceApi, VoiceLang } from "./useVoice";

const LANGUAGES: { id: VoiceLang; label: string; note: string }[] = [
  { id: "en", label: "English", note: "English" },
  { id: "fa", label: "فارسی", note: "Persian" },
];

// Reading aloud and listening, in English and Persian. The microphone button itself sits next to the command box (JarvisPanel).
export default function VoiceBar({ voice, onReadNews, onReadPlans, hasNews, hasPlans }: { voice: VoiceApi; onReadNews: () => void; onReadPlans: () => void; hasNews: boolean; hasPlans: boolean }) {
  const reading = voice.speakingId !== "";
  return <section className={styles.voiceBar} aria-label="Voice: listen to Jarvis and talk to Jarvis">
    <div className={styles.voiceRow}>
      <div className={styles.langPick} role="radiogroup" aria-label="Voice language (listening and reading)">
        {LANGUAGES.map((language) => <button key={language.id} type="button" role="radio" aria-checked={voice.prefs.lang === language.id}
          className={voice.prefs.lang === language.id ? styles.langActive : ""} onClick={() => voice.update({ lang: language.id })}>
          <span lang={language.id} dir="auto">{language.label}</span>{language.id === "fa" ? <small>Persian</small> : null}
        </button>)}
      </div>
      <button className={styles.voiceButton} type="button" onClick={onReadNews} disabled={!voice.canSpeak || !hasNews} title="Reads aloud everything listed below, newest first">
        <Newspaper size={14} strokeWidth={1.75} aria-hidden="true" />Read the news
      </button>
      <button className={styles.voiceButton} type="button" onClick={onReadPlans} disabled={!voice.canSpeak || !hasPlans} title="Reads aloud what is planned, soonest first">
        <CalendarClock size={14} strokeWidth={1.75} aria-hidden="true" />Read what’s coming up
      </button>
      {reading && <button className={`${styles.voiceButton} ${styles.voiceStop}`} type="button" onClick={voice.stopReading}><Square size={13} strokeWidth={2} aria-hidden="true" />Stop reading</button>}
    </div>
    <div className={styles.voiceRow}>
      <label className={styles.checkRow}><input type="checkbox" checked={voice.prefs.speakAnswers} disabled={!voice.canSpeak} onChange={(event) => voice.update({ speakAnswers: event.target.checked })} /> Read Jarvis’s answers aloud</label>
      <label className={styles.checkRow}><input type="checkbox" checked={voice.prefs.autoRun} disabled={!voice.canListen} onChange={(event) => voice.update({ autoRun: event.target.checked })} /> Run my command as soon as I stop talking</label>
    </div>
    {voice.note && <p className={styles.warnBox} role="status">{voice.note}</p>}
    {!voice.canSpeak && <p className={styles.noteSoft}>This browser cannot read aloud. Chrome, Edge and Safari can.</p>}
    {!voice.canListen && <p className={styles.noteSoft}>This browser has no voice typing (Chrome, Edge and Safari do). You can still type everything.</p>}
    <p className={styles.voiceNote}>Reading aloud uses the voices installed on this device. Voice typing sends what you say to your browser’s own online speech service (for example Google in Chrome, Apple in Safari) to turn it into text. Persian needs a Persian voice on the device; if there is none, Jarvis says so and shows the text instead.</p>
  </section>;
}
