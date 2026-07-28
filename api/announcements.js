import { put, list } from "@vercel/blob";

export default async function handler(req, res) {

```
try {

    if (req.method === "POST") {

        const {
            number,
            title,
            subtitle,
            sections,
            content
        } = req.body || {};

        if (
            !title ||
            typeof title !== "string" ||
            !title.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: "An announcement title is required."
            });
        }

        if (
            !content ||
            typeof content !== "string" ||
            !content.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: "Announcement content is required."
            });
        }

        const existing = await list({
            prefix: "announcements/"
        });

        const announcementNumber =
            number && String(number).trim()
                ? String(number).padStart(3, "0")
                : String(existing.blobs.length + 1).padStart(3, "0");

        const id = crypto.randomUUID();

        const announcement = {
            id,
            number: announcementNumber,
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
            publishedAt: new Date().toISOString()
        };

        const pathname =
            `announcements/${Date.now()}-${id}.json`;

        await put(
            pathname,
            JSON.stringify(announcement),
            {
                access: "public",
                contentType: "application/json",
                addRandomSuffix: false
            }
        );

        return res.status(201).json({
            success: true,
            announcement
        });
    }

    if (req.method === "GET") {

        const result = await list({
            prefix: "announcements/"
        });

        const announcements = [];

        for (const blob of result.blobs) {

            try {

                const response = await fetch(blob.url);

                if (!response.ok) {
                    continue;
                }

                const announcement =
                    await response.json();

                announcements.push(announcement);

            } catch (error) {

                console.error(
                    "Could not read announcement:",
                    blob.pathname,
                    error
                );

            }

        }

        announcements.sort(
            (a, b) =>
                new Date(b.publishedAt) -
                new Date(a.publishedAt)
        );

        return res.status(200).json({
            success: true,
            announcements
        });
    }

    return res.status(405).json({
        success: false,
        error: "Method not allowed."
    });

} catch (error) {

    console.error(
        "Announcement API error:",
        error
    );

    return res.status(500).json({
        success: false,
        error: "An internal server error occurred."
    });

}
```

}
