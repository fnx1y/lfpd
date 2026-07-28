export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!clientId) {
        return res.status(500).json({
            error: "DISCORD_CLIENT_ID is not configured."
        });
    }

    const redirectUri = "https://lfpd.vercel.app/api/callback";

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify"
    });

    const discordUrl =
        `https://discord.com/oauth2/authorize?${params.toString()}`;

    res.redirect(302, discordUrl);
}
