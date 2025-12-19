import axios from "axios";
import Twilio from "twilio";
import fs from "fs";

const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const DB_FILE = "notified_games.json";

let notifiedGames = [];
if (fs.existsSync(DB_FILE)) {
  try {
    notifiedGames = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) { notifiedGames = []; }
}

async function sendWhatsApp(msg) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: msg,
    });
    console.log("WhatsApp enviado con éxito.");
  } catch (error) {
    console.error("Error Twilio:", error.message);
  }
}

async function checkGames() {
  try {
    // Obtenemos todos los giveaways activos
    const res = await axios.get("https://www.gamerpower.com/api/giveaways");
    const games = res.data;

    console.log(`Analizando ${games.length} ofertas disponibles...`);
    
    let nuevosParaNotificar = [];

    for (const g of games) {
      const platformStr = g.platforms.toLowerCase();
      
      // FILTROS SOLICITADOS:
      // 1. Epic Games
      // 2. Steam
      // 3. Amazon Prime Gaming
      // 4. Microsoft Store (PC)
      // 5. Ubisoft Connect
      const matchPlataforma = [
        "epic", 
        "steam", 
        "amazon", 
        "prime", 
        "microsoft", 
        "ubisoft", 
        "uplay"
      ].some(p => platformStr.includes(p));

      // Solo juegos (no DLCs ni items) y que sean 100% gratis
      const esJuegoGratis = (g.type === "Game") && (g.worth === "N/A" || g.worth.includes("100%"));

      if (matchPlataforma && esJuegoGratis && !notifiedGames.includes(g.id)) {
        console.log(`+ Nuevo juego detectado: ${g.title}`);
        
        nuevosParaNotificar.push(
          `🎁 *${g.title}*\n🏢 Plataforma: ${g.platforms}\n🔗 ${g.open_giveaway_url}`
        );
        
        notifiedGames.push(g.id);
      }
    }

    // Si encontramos juegos nuevos, mandamos UN SOLO mensaje con la lista
    if (nuevosParaNotificar.length > 0) {
      const cabecera = `🎮 *¡NUEVOS JUEGOS GRATIS!* 🎮\n_Revisión: ${new Date().toLocaleString()}_\n\n`;
      const cuerpo = nuevosParaNotificar.join("\n\n---\n\n");
      
      await sendWhatsApp(cabecera + cuerpo);

      // Limpieza de historial para que no crezca infinitamente
      if (notifiedGames.length > 30) notifiedGames = notifiedGames.slice(-15);
      
      fs.writeFileSync(DB_FILE, JSON.stringify(notifiedGames));
      console.log("Historial actualizado.");
    } else {
      console.log("No se encontraron novedades.");
    }

  } catch (error) {
    console.error("Error en el proceso:", error.message);
  }
}

checkGames();
