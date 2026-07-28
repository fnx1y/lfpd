import { put, list, get } from "@vercel/blob";

export default async function handler(req, res) {
    try {
        if (req.method === "POST") {
            const {
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

            let announcementSections = [];

            if (Array.isArray(sections)) {
                announcementSections = sections
                    .filter(section => section && typeof section === "object")
                    .map(section => ({
                        heading:
                            typeof section.heading === "string"
                                ? section.heading.trim()
                                : "",
                        label:
                            typeof section.label === "string"
                                ? section.label.trim()
                                : "ANNOUNCEMENT",
                        content:
                            typeof section.content === "string"
                                ? section.content
                                : ""
                    }))
                    .filter(section =>
                        section.heading ||
                        section.content.trim()
                    );
            }

            if (
                announcementSections.length === 0 &&
                (!content ||
                    typeof content !== "string" ||
                    !content.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    error: "Announcement content is required."
                });
            }

            const existing = await list({
                prefix: "announcements/"
            });

            const currentCount = existing.blobs.length;

            const createdAnnouncements = [];

            if (announcementSections.length > 0) {
                for (
                    let index = 0;
                    index < announcementSections.length;
                    index++
                ) {
                    const section =
                        announcementSections[index];

                    const id =
                        crypto.randomUUID();

                    const announcementNumber =
                        String(
                            currentCount + index + 1
                        ).padStart(3, "0");

                    const announcement = {
                        id,
                        number: announcementNumber,

                        title:
                            section.heading ||
                            title.trim(),

                        subtitle:
                            typeof subtitle === "string"
                                ? subtitle.trim()
                                : "",

                        label:
                            section.label ||
                            "ANNOUNCEMENT",

                        content:
                            section.content,

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

                    createdAnnouncements.push(
                        announcement
                    );
                }
            } else {
                const id =
                    crypto.randomUUID();

                const announcementNumber =
                    String(
                        currentCount + 1
                    ).padStart(3, "0");

                const announcement = {
                    id,
                    number: announcementNumber,
                    title: title.trim(),

                    subtitle:
                        typeof subtitle === "string"
                            ? subtitle.trim()
                            : "",

                    label: "ANNOUNCEMENT",

                    content: content,

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

                createdAnnouncements.push(
                    announcement
                );
            }

            return res.status(201).json({
                success: true,
                announcements:
                    createdAnnouncements
            });
        }

        if (req.method === "GET") {
            const result = await list({
                prefix: "announcements/"
            });

            const announcements = [];

            for (const blob of result.blobs) {
                try {
                    const blobResult =
                        await get(
                            blob.pathname,
                            {
                                access: "private",
                                useCache: false
                            }
                        );

                    if (
                        !blobResult ||
                        !blobResult.stream
                    ) {
                        continue;
                    }

                    const reader =
                        blobResult.stream.getReader();

                    const chunks = [];

                    while (true) {
                        const {
                            value,
                            done
                        } = await reader.read();

                        if (done) {
                            break;
                        }

                        chunks.push(value);
                    }

                    const totalLength =
                        chunks.reduce(
                            (total, chunk) =>
                                total + chunk.length,
                            0
                        );

                    const combined =
                        new Uint8Array(
                            totalLength
                        );

                    let offset = 0;

                    for (const chunk of chunks) {
                        combined.set(
                            chunk,
                            offset
                        );

                        offset += chunk.length;
                    }

                    const text =
                        new TextDecoder().decode(
                            combined
                        );

                    const announcement =
                        JSON.parse(text);

                    announcements.push(
                        announcement
                    );
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
            error:
                error?.message ||
                "An internal server error occurred."
        });
    }
}
