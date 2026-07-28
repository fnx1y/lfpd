export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send("Missing Discord authorization code.");
    }

    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(500).send("Discord OAuth is not configured.");
    }

    const redirectUri = "https://lfpd.vercel.app/api/callback";

    try {
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri
            })
        });

        if (!tokenResponse.ok) {
            return res.status(401).send("Discord authorization failed.");
        }

        const tokenData = await tokenResponse.json();

        const userResponse = await fetch("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`
            }
        });

        if (!userResponse.ok) {
            return res.status(401).send("Unable to retrieve your Discord account.");
        }

        const user = await userResponse.json();

        res.setHeader(
            "Set-Cookie",
            `discord_user=${encodeURIComponent(JSON.stringify({
                id: user.id,
                username: user.username,
                global_name: user.global_name || user.username
            }))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`
        );

        res.redirect(302, "/admin.html");

    } catch (error) {
        console.error(error);
        return res.status(500).send("An unexpected authentication error occurred.");
    }
}
