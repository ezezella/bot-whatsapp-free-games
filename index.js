import axios from "axios";
import Twilio from "twilio";

// Configuración de Twilio desde variables de entorno
const client = Twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);

async function sendWhatsApp(msg) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: process.env.WHATSAPP_TO,
      body: msg,
    });
    console.log("Mensaje enviado:", msg);
  } catch (error) {
    console.error("Error enviando WhatsApp:", error);
  }
}

async function checkEpic() {
  const res = await axios.get("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions");
  const games = res.data.data.Catalog.searchStore.elements;
  for (const g of games) {
    // Verificamos si es un juego actualmente gratuito (precio 0)
    const isFree = g.price.totalPrice.discountPrice === 0;
    if (isFree && g.promotions?.promotionalOffers?.length) {
      await sendWhatsApp(`🎁 Epic GRATIS:\n${g.title}`);
    }
  }
}

async function checkSteam() {
  const res = await axios.get("https://store.steampowered.com/api/featuredcategories/?cc=US");
  const free = res.data.specials.items.filter(i => i.final_price === 0);
  for (const g of free) {
    await sendWhatsApp(`🎮 Steam GRATIS:\n${g.name}`);
  }
}

// Ejecución principal
(async () => {
  console.log("Iniciando chequeo...");
  await checkEpic();
  await checkSteam();
  console.log("Finalizado.");
})();