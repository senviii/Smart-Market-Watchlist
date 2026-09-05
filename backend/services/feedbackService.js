import Interaction from "../models/Interaction.js";

async function getPersonalizedWeights(userId) {
  const interactions = await Interaction.find({ userId }).sort({ createdAt: -1 }).limit(200);

  const stats = {};
  for (const i of interactions) {
    if (!stats[i.eventType]) stats[i.eventType] = { clicks: 0, dismissals: 0 };
    if (i.action === "clicked") stats[i.eventType].clicks += 1;
    else stats[i.eventType].dismissals += 1;
  }

  const weights = {};
  for (const [eventType, { clicks, dismissals }] of Object.entries(stats)) {
    const total = clicks + dismissals;
    if (total < 3) {
      weights[eventType] = 1.0;
      continue;
    }
    const engagementRatio = clicks / total;
    weights[eventType] = 0.6 + engagementRatio * 0.8;
  }

  return weights;
}

async function logInteraction(userId, symbol, eventType, action) {
  return Interaction.create({ userId, symbol, eventType, action });
}

export { getPersonalizedWeights, logInteraction };