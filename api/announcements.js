```javascript
import { put, list, get, del } from "@vercel/blob";

async function readBlob(blob) {
    const result = await get(blob.pathname, {
        access: "private",
        useCache: false
    });

    if (!result || !result.stream) {
        throw new Error("Unable to read announcement.");
    }

    const reader = result.stream.getReader();
    const chunks = [];

    while (true) {
        const { value, done } = await reader.read();

        if (done) {
            break;
        }

        chunks.push(value);
    }

    const totalLength = chunks.reduce(
        (total, chunk) => total + chunk.length,
        0
    );

    const combined = new Uint8Array(totalLength);

    let offset = 0;

    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }

    const text = new TextDecoder().decode(combined);

    return JSON.parse(text);
}

async function getAnnouncements() {
    const result = await list({
        prefix: "announcements/"
    });

    const announcements = [];

    for (const blob of result.blobs) {
        try {
            const announcement = await readBlob(blob);

            announcements.push({
                ...announcement,
                _pathname: blob.pathname
            });
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

    return announcements;
}

export default async function handler(req, res) {
    try {
        if (req.method === "GET") {
            const announcements = await getAnnouncements();

            return res.status(200).json({
                success: true,
                announcements: announcements.map(
                    ({ _pathname, ...announcement }) =>
                        announcement
                )
            });
        }

        if (req.method === "POST") {
            const {
                title,
                label,
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

            const existing =
                await getAnnouncements();

            const id =
                crypto.randomUUID();

            const number =
                String(existing.length + 1)
                    .padStart(2, "0");

            const announcement = {
                id,
                number,
                title: title.trim(),
                label:
                    typeof label === "string" &&
                    label.trim()
                        ? label.trim()
                        : "ANNOUNCEMENT",
                content,
                publishedAt:
                    new Date().toISOString(),
                updatedAt:
                    new Date().toISOString()
            };

            const pathname =
                `announcements/${Date.now()}-${id}.json`;

            await put(
                pathname,
                JSON.stringify(announcement),
                {
                    access: "private",
                    contentType: "application/json",
                    addRandomSuffix: false
                }
            );

            return res.status(201).json({
                success: true,
                announcement
            });
        }

        if (req.method === "PUT") {
            const {
                id,
                title,
                label,
                content
            } = req.body || {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Announcement ID is required."
                });
            }

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

            const announcements =
                await getAnnouncements();

            const existing =
                announcements.find(
                    announcement =>
                        String(announcement.id) ===
                        String(id)
                );

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: "Announcement not found."
                });
            }

            const updated = {
                id: existing.id,
                number: existing.number,
                title: title.trim(),
                label:
                    typeof label === "string" &&
                    label.trim()
                        ? label.trim()
                        : "ANNOUNCEMENT",
                content,
                publishedAt:
                    existing.publishedAt,
                updatedAt:
                    new Date().toISOString()
            };

            await put(
                existing._pathname,
                JSON.stringify(updated),
                {
                    access: "private",
                    contentType: "application/json",
                    addRandomSuffix: false
                }
            );

            return res.status(200).json({
                success: true,
                announcement: updated
            });
        }

        if (req.method === "DELETE") {
            const id =
                req.query?.id ||
                req.body?.id;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: "Announcement ID is required."
                });
            }

            const announcements =
                await getAnnouncements();

            const existing =
                announcements.find(
                    announcement =>
                        String(announcement.id) ===
                        String(id)
                );

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: "Announcement not found."
                });
            }

            await del(
                existing._pathname
            );

            return res.status(200).json({
                success: true,
                message: "Announcement deleted successfully."
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
            error:
                error?.message ||
                "An internal server error occurred."
        });
    }
}
```
