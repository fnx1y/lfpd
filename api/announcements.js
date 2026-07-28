export default async function handler(req, res) {

    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed."
        });
    }

    try {

        const sessionResponse = await fetch(
            `${getBaseUrl(req)}/api/session`,
            {
                headers: {
                    cookie: req.headers.cookie || ""
                }
            }
        );

        if (!sessionResponse.ok) {
            return res.status(401).json({
                success: false,
                error: "Unable to verify your session."
            });
        }

        const session = await sessionResponse.json();

        if (
            !session.authenticated ||
            !session.authorized
        ) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to publish announcements."
            });
        }

        const {
            number,
            title,
            subtitle,
            sections,
            content
        } = req.body || {};

        if (!title || typeof title !== "string") {
            return res.status(400).json({
                success: false,
                error: "An announcement title is required."
            });
        }

        if (!content || typeof content !== "string") {
            return res.status(400).json({
                success: false,
                error: "Announcement content is required."
            });
        }

        if (
            sections !== undefined &&
            !Array.isArray(sections)
        ) {
            return res.status(400).json({
                success: false,
                error: "Announcement sections must be an array."
            });
        }

        const announcement = {
            id: crypto.randomUUID(),

            number: number
                ? String(number).padStart(3, "0")
                : null,

            title: title.trim(),

            subtitle:
                typeof subtitle === "string"
                    ? subtitle.trim()
                    : "",

            sections:
                Array.isArray(sections)
                    ? sections
                        .filter(section =>
                            typeof section === "string"
                        )
                        .map(section => section.trim())
                        .filter(Boolean)
                    : [],

            content,

            publishedAt: new Date().toISOString(),

            author:
                session.username ||
                session.user?.username ||
                "LFPD Administration"
        };

        return res.status(200).json({
            success: true,
            announcement
        });

    } catch (error) {

        console.error(
            "Announcement publishing error:",
            error
        );

        return res.status(500).json({
            success: false,
            error: "An internal server error occurred."
        });

    }

}

function getBaseUrl(req) {

    const protocol =
        req.headers["x-forwarded-proto"] ||
        "https";

    const host =
        req.headers["x-forwarded-host"] ||
        req.headers.host;

    return `${protocol}://${host}`;

}
