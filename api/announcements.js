import { put, list, get, del } from "@vercel/blob";

async function readBlob(blob) {
    const result = await get(
        blob.pathname,
        {
            access: "private",
            useCache: false
        }
    );

    if (!result || !result.stream) {
        return null;
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

async function findAnnouncement(id) {
    const result = await list({
        prefix: "announcements/"
    });

    for (const blob of result.blobs) {
        try {
            const announcement = await readBlob(blob);

            if (
                announcement &&
                String(announcement.id) === String(id)
            ) {
                return {
                    announcement,
                    pathname: blob.pathname
                };
            }
        } catch (error) {
            console.error(
                "Could not read announcement:",
                blob.pathname,
                error
            );
        }
    }

    return null;
}

function cleanSections(sections) {
    if (!Array.isArray(sections)) {
        return [];
    }

    return sections
        .filter(
            section =>
                section &&
                typeof section.heading === "string" &&
                section.heading.trim() &&
                typeof section.content === "string" &&
                section.content.trim()
        )
        .map(section => ({
            heading: section.heading.trim(),

            label:
                typeof section.label === "string" &&
                section.label.trim()
                    ? section.label.trim()
                    : "ANNOUNCEMENT",

            content: section.content
        }));
}

export default async function handler(req, res) {
    try {
        if (req.method === "GET") {
            const result = await list({
                prefix: "announcements/"
            });

            const announcements = [];

            for (const blob of result.blobs) {
                try {
                    const announcement = await readBlob(blob);

                    if (!announcement) {
                        continue;
                    }

                    if (!Array.isArray(announcement.sections)) {
                        announcement.sections = [];
                    }

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
                    new Date(b.publishedAt || 0) -
                    new Date(a.publishedAt || 0)
            );

            return res.status(200).json({
                success: true,
                announcements
            });
        }

        if (req.method === "POST") {
            const {
                title,
                subtitle,
                sections
            } = req.body || {};

            if (
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "A main announcement title is required."
                });
            }

            const validSections =
                cleanSections(sections);

            if (!validSections.length) {
                return res.status(400).json({
                    success: false,
                    error:
                        "At least one section is required."
                });
            }

            const existing = await list({
                prefix: "announcements/"
            });

            const id = crypto.randomUUID();

            const announcement = {
                id,

                number:
                    String(
                        existing.blobs.length + 1
                    ).padStart(3, "0"),

                title: title.trim(),

                subtitle:
                    typeof subtitle === "string"
                        ? subtitle.trim()
                        : "",

                sections: validSections,

                publishedAt:
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
                subtitle,
                sections
            } = req.body || {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Announcement ID is required."
                });
            }

            if (
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error:
                        "A main announcement title is required."
                });
            }

            const validSections =
                cleanSections(sections);

            if (!validSections.length) {
                return res.status(400).json({
                    success: false,
                    error:
                        "At least one section is required."
                });
            }

            const found =
                await findAnnouncement(id);

            if (!found) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement could not be found."
                });
            }

            const updated = {
                ...found.announcement,

                title: title.trim(),

                subtitle:
                    typeof subtitle === "string"
                        ? subtitle.trim()
                        : "",

                sections: validSections
            };

            await put(
                found.pathname,
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
                typeof req.query?.id === "string"
                    ? req.query.id
                    : typeof req.body?.id === "string"
                        ? req.body.id
                        : null;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error:
                        "Announcement ID is required."
                });
            }

            const found =
                await findAnnouncement(id);

            if (!found) {
                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement could not be found."
                });
            }

            await del(found.pathname);

            return res.status(200).json({
                success: true,
                message:
                    "Announcement deleted successfully."
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
