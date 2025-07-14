export function formatExpiresAt(expireTimeInSeconds) {
    const convSecondsToMiliseconds = 1000;
    return Date.now() + expireTimeInSeconds * convSecondsToMiliseconds;
}