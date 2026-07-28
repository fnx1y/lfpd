export default function handler(req, res) {
    const cookieHeader = req.headers.cookie || "";

    const cookies = {};

    cookieHeader.split(";").forEach(cookie => {
        const [name, ...valueParts] = cookie.trim().split("=");

        if (!name) return;

        cookies[name] = valueParts.join("=");
    });

    if (!cookies.discord_user) {
        return res.status(200).json({
            authenticated: false,
            authorized: false
        });
    }

    let user;

    try {
        user = JSON.parse(
            decodeURIComponent(cookies.discord_user)
        );
    } catch {
        return res.status(200).json({
            authenticated: false,
            authorized: false
        });
    }

    const authorizedUserId =
        process.env.ADMIN_DISCORD_USER_ID;

    if (!authorizedUserId) {
        return res.status(500).json({
            authenticated: true,
            authorized: false,
            error: "ADMIN_DISCORD_USER_ID is not configured."
        });
    }

    const authorized =
        user.id === authorizedUserId;

    return res.status(200).json({
        authenticated: true,
        authorized,
        user: {
            id: user.id,
            username: user.username,
            global_name: user.global_name
        }
    });
}
