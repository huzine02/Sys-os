
import { GoogleGenAI } from "@google/genai";
import { AppData } from '../types';
import { PHASE_DATA } from '../utils';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

// Initialisation sécurisée
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const aiService = {
    // 1. GENERATE TASKS (EXPRESS)
    async generateTasks(
        context: string, 
        blueprint: AppData['blueprint'], 
        userInput: string, 
        _mode: 'auto' | 'tasks' | 'analysis',
        fileBase64?: string,
        fileType?: string
    ) {
        const phase = PHASE_DATA[blueprint.phase] || PHASE_DATA[1];
        
        // SYSTEM PROMPT RENFORCÉ (CLASSIFICATION ASSETS & IMMO)
        const systemPrompt = `Rôle : Assistant Stratégique de Ressources & Trieur de Tâches Expert.

DÉFINITIONS CATÉGORIES (RÈGLES ABSOLUES) :

1. "pro" (SALARIÉ) : Uniquement le travail pour l'employeur principal. Boss, réunions d'équipe, collègues, objectifs corpo.
   - INTERDIT : Code perso, projets business perso.

2. "saas" (SIDE-PROJECTS/DEV) : Mes projets personnels, mon code à moi, mes applications, mon business en ligne, blueprint, dev, marketing perso.

3. "vie" (PERSO/SANTÉ) : Santé, Sport, Famille, Courses, Loisirs, Social.

4. GESTION DE PATRIMOINE & IMMOBILIER (DÉTAILLER AU MAXIMUM) :
   Ne pas tout mettre dans "patri". Utilise les sous-catégories si applicable :
   - "copro" : Tout ce qui touche à la copropriété, syndic, AG, charges d'immeuble, voisins, parties communes.
   - "airbnb" : Gestion locative courte durée, guests, check-in/out, ménage locatif, revenus locatifs, maintenance locataire.
   - "maison" : Ma résidence principale, travaux perso, jardinage, domotique, entretien du foyer.
   - "patri" : (PAR DÉFAUT) Banque, Bourse (PEA/CTO), Impôts, Assurances, Administratif général, Notaire (hors vente spécifique), Investissements financiers.

EXEMPLES DE DÉCISION :
- "Payer la taxe foncière de l'appart locatif" -> "airbnb" (lié au bien locatif)
- "Appeler le syndic pour la fuite toiture" -> "copro"
- "Faire un virement sur le PEA" -> "patri"
- "Tondre la pelouse" -> "maison"
- "Coder la landing page" -> "saas"

RÈGLES DE FORMATAGE (JSON) :
- "text" : Description courte + Durée estimée en minutes entre parenthèses à la fin. Ex: "Relancer client (15)". Estime la durée si absente.
- "priority" : 'H' (High), 'M' (Medium), 'L' (Low).
- "type" : Doit être l'une des valeurs exactes : "pro", "saas", "vie", "patri", "copro", "airbnb", "maison".

CONTEXTE ACTUEL :
${context}

BLUEPRINT (Phase ${blueprint.phase} - ${phase.name}) :
- Objectif : ${phase.objective}
- Cible : ${blueprint.mrr} / ${phase.target}

INSTRUCTION :
1. Analyse l'entrée et le fichier joint (si présent).
2. Détermine la catégorie avec précision selon les règles ci-dessus.
3. Génère une analyse stratégique courte (<analysis>).
4. Génère le tableau JSON des tâches (<tasks>).

FORMAT DE SORTIE STRICT :
<analysis>
Analyse en français...
</analysis>
<tasks>
[
  {"type": "airbnb", "text": "Répondre message guest (10)", "priority": "H"},
  {"type": "patri", "text": "Déclarer revenus (60)", "priority": "H"},
  {"type": "maison", "text": "Réparer poignée porte (15)", "priority": "L"}
]
</tasks>`;

        const parts: any[] = [];
        
        if (fileBase64) {
             parts.push({
                inlineData: {
                    mimeType: fileType || "image/png",
                    data: fileBase64.split(',')[1] 
                }
            });
        }
        
        if (userInput) {
            parts.push({ text: userInput });
        } else if (fileBase64) {
             parts.push({ text: "Analyse ce document." });
        }

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Utilisation du modèle Flash pour la rapidité
                contents: { parts },
                config: {
                    systemInstruction: systemPrompt,
                    temperature: 0.1 // Température très basse pour respecter strictement la classification
                }
            });
            return response.text || "";
        } catch (error) {
            console.error("AI Error:", error);
            return "<analysis>Erreur de connexion à l'IA. Vérifiez votre clé API.</analysis>";
        }
    },

    // 2. STRATEGIC CHECK
    async strategicCheck(blueprint: AppData['blueprint'], action: string) {
        const phase = PHASE_DATA[blueprint.phase] || PHASE_DATA[1];
        const systemPrompt = `Rôle : Conseiller Stratégique Strict.

CONTEXTE BLUEPRINT :
- Phase Actuelle : ${blueprint.phase} (${phase.name})
- Objectif : ${phase.objective}
- Principe Clé : "${phase.reminder}"

PRINCIPES GLOBAUX :
${blueprint.principles}

MISSION :
L'utilisateur veut : "${action}"
1. Est-ce ALIGNÉ avec la phase actuelle ?
2. Si NON : explique pourquoi en français.
3. Si OUI : valide en français.

FORMAT DE SORTIE REQUIS :
<verdict>ALIGNE ou NON_ALIGNE</verdict>
<analysis>Courte analyse du pourquoi en français.</analysis>
<recommendation>Conseil actionnable en français.</recommendation>
<tasks>
[{"type": "pro", "text": "Action Corrective (15)", "priority": "H"}]
</tasks>`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash', // Pro pour le raisonnement complexe
                contents: action,
                config: {
                    systemInstruction: systemPrompt
                }
            });
            return response.text || "";
        } catch (error) {
             return "<verdict>ERROR</verdict><analysis>Service indisponible.</analysis>";
        }
    },

    // 3. CHAT COACH
    async chat(context: string, blueprint: AppData['blueprint'], history: ChatMessage[]) {
        const phase = PHASE_DATA[blueprint.phase] || PHASE_DATA[1];
        const systemPrompt = `Rôle : Coach de Productivité & Système OS.
        
CONTEXTE :
${context}

PHASE (${phase.name}) :
- Obj : ${phase.objective}

COMPORTEMENT :
- Réponds TOUJOURS EN FRANÇAIS.
- Précision militaire, concis.
- Orienté action.`;

        // Séparation : Historique vs Dernier message
        // history contient déjà le dernier message de l'utilisateur ajouté dans CommandCenter
        const lastMessage = history[history.length - 1];
        const previousMessages = history.slice(0, history.length - 1);

        // Formatage de l'historique pour le SDK Gemini
        const formattedHistory = previousMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        try {
            // Utilisation correcte de 'chats.create'
            const chatSession = ai.chats.create({
                model: 'gemini-2.5-flash',
                history: formattedHistory,
                config: {
                    systemInstruction: systemPrompt
                }
            });

            const result = await chatSession.sendMessage({ message: lastMessage.content });
            return result.text;
        } catch (error: any) {
            console.error("Chat Error:", error);
            return `Erreur système: ${error.message || "Non connectée"}`;
        }
    },

    // 4. MORNING BRIEF (Proactive AI — auto-triggered at first load)
    async morningBrief(tasks: { text: string; type: string; todayStar: boolean; done: boolean; nextDate?: string; createdAt: string }[], agenda: { title: string; time: string; date: string; important: boolean }[], todayStr: string, isVpn: boolean) {
        const overdue = tasks.filter(t => !t.done && t.nextDate && t.nextDate < todayStr).slice(0, 5);
        const starred = tasks.filter(t => t.todayStar && !t.done).slice(0, 5);
        const todayEvents = agenda.filter(e => e.date === todayStr);
        const stale = tasks.filter(t => !t.done && t.createdAt && (Date.now() - new Date(t.createdAt).getTime()) > 14 * 86400000).slice(0, 3);

        const prompt = isVpn
            ? `You are a productivity assistant. Give a 3-line daily briefing in English based on this data. Be direct and actionable.
Starred tasks: ${starred.map(t => t.text).join(', ') || 'None'}
Today's meetings: ${todayEvents.map(e => `${e.time} ${e.title}`).join(', ') || 'None'}
Overdue tasks: ${overdue.map(t => t.text).join(', ') || 'None'}
Old tasks (>14 days): ${stale.map(t => t.text).join(', ') || 'None'}
Reply with exactly 3 short lines. No markdown.`
            : `Tu es un coach productivité. Donne un briefing matinal de 3 lignes max basé sur ces données. Sois direct et actionnable.
Tâches starred: ${starred.map(t => t.text).join(', ') || 'Aucune'}
RDV aujourd'hui: ${todayEvents.map(e => `${e.time} ${e.title}`).join(', ') || 'Aucun'}
Tâches en retard: ${overdue.map(t => t.text).join(', ') || 'Aucune'}
Tâches anciennes (>14j): ${stale.map(t => t.text).join(', ') || 'Aucune'}
Réponds avec exactement 3 lignes courtes. Pas de markdown.`;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { temperature: 0.1 }
            });
            return response.text || '';
        } catch (error) {
            console.error('Morning Brief Error:', error);
            return '';
        }
    },

    // PARSEUR ROBUSTE (Avec Fallback JSON)
    parseResponse(text: string) {
        if (!text) return { analysis: '', tasks: [], verdict: null, recommendation: null, raw: '' };

        const analysisMatch = text.match(/<analysis>([\s\S]*?)<\/analysis>/i);
        const tasksMatch = text.match(/<tasks>([\s\S]*?)<\/tasks>/i);
        const verdictMatch = text.match(/<verdict>([\s\S]*?)<\/verdict>/i);
        const recMatch = text.match(/<recommendation>([\s\S]*?)<\/recommendation>/i);

        let tasks: any[] = [];
        
        // Tentative 1 : Extraction via balises XML
        let jsonStr = tasksMatch ? tasksMatch[1].trim() : null;

        // Tentative 2 : Fallback (Si l'IA a oublié les balises mais a donné du JSON)
        if (!jsonStr) {
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1) {
                jsonStr = text.substring(firstBracket, lastBracket + 1);
            }
        }

        if (jsonStr) {
            try {
                // Nettoyage Markdown (```json ...)
                const cleanJson = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
                tasks = JSON.parse(cleanJson);
                
                // Validation de structure minimale
                if (Array.isArray(tasks)) {
                    tasks = tasks.map(t => ({
                        ...t, 
                        id: Date.now() + Math.random(), 
                        done: false, 
                        todayStar: false, 
                        createdAt: new Date().toISOString(),
                        priority: t.priority || 'M',
                        type: t.type || 'pro'
                    }));
                } else {
                    tasks = [];
                }
            } catch (e) { console.error("JSON Parse Error", e); }
        }

        return {
            analysis: analysisMatch ? analysisMatch[1].trim() : (jsonStr ? "Analyse implicite (Tâches extraites directements)" : ""),
            tasks: tasks,
            verdict: verdictMatch ? verdictMatch[1].trim() : null,
            recommendation: recMatch ? recMatch[1].trim() : null,
            raw: text
        };
    }
};
