import { put, list, get, del } from "@vercel/blob";

async function readAnnouncement(blob) {
    try {
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

        const reader =
            result.stream.getReader();

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

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Could not read announcement:",
            blob.pathname,
            error
        );

        return null;
    }
}

async function getAllAnnouncements() {

    const result =
        await list({
            prefix: "announcements/"
        });

    const announcements = [];

    for (const blob of result.blobs) {

        const announcement =
            await readAnnouncement(blob);

        if (announcement) {

            announcements.push({
                ...announcement,
                _pathname: blob.pathname
            });

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
                    error:
                        "An announcement title is required."
                });

            }

            let announcementSections = [];

            if (Array.isArray(sections)) {

                announcementSections =
                    sections
                        .filter(
                            section =>
                                section &&
                                typeof section === "object"
                        )
                        .map(
                            section => ({
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
                            })
                        )
                        .filter(
                            section =>
                                section.heading ||
                                section.content.trim()
                        );

            }

            if (
                announcementSections.length === 0 &&
                (
                    !content ||
                    typeof content !== "string" ||
                    !content.trim()
                )
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Announcement content is required."
                });

            }

            const existing =
                await getAllAnnouncements();

            const highestNumber =
                existing.reduce(
                    (highest, announcement) => {

                        const number =
                            parseInt(
                                announcement.number,
                                10
                            );

                        return Number.isFinite(number)
                            ? Math.max(
                                highest,
                                number
                            )
                            : highest;

                    },
                    0
                );

            const createdAnnouncements = [];

            if (
                announcementSections.length > 0
            ) {

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
                            highestNumber +
                            index +
                            1
                        ).padStart(
                            3,
                            "0"
                        );

                    const announcement = {

                        id,

                        number:
                            announcementNumber,

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
                        `announcements/${id}.json`;

                    await put(
                        pathname,
                        JSON.stringify(
                            announcement
                        ),
                        {
                            access: "private",
                            contentType:
                                "application/json",
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
                        highestNumber + 1
                    ).padStart(
                        3,
                        "0"
                    );

                const announcement = {

                    id,

                    number:
                        announcementNumber,

                    title:
                        title.trim(),

                    subtitle:
                        typeof subtitle === "string"
                            ? subtitle.trim()
                            : "",

                    label:
                        "ANNOUNCEMENT",

                    content,

                    publishedAt:
                        new Date().toISOString()

                };

                const pathname =
                    `announcements/${id}.json`;

                await put(
                    pathname,
                    JSON.stringify(
                        announcement
                    ),
                    {
                        access: "private",
                        contentType:
                            "application/json",
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

            const announcements =
                await getAllAnnouncements();

            const cleanAnnouncements =
                announcements.map(
                    announcement => {

                        const {
                            _pathname,
                            ...clean
                        } = announcement;

                        return clean;

                    }
                );

            return res.status(200).json({
                success: true,
                announcements:
                    cleanAnnouncements
            });

        }

        if (req.method === "PUT") {

            const {
                id,
                title,
                subtitle,
                label,
                content
            } = req.body || {};

            if (
                !id ||
                typeof id !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "An announcement ID is required."
                });

            }

            if (
                !title ||
                typeof title !== "string" ||
                !title.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "An announcement title is required."
                });

            }

            if (
                !content ||
                typeof content !== "string" ||
                !content.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "Announcement content is required."
                });

            }

            const announcements =
                await getAllAnnouncements();

            const existing =
                announcements.find(
                    announcement =>
                        String(
                            announcement.id
                        ) === String(id)
                );

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement not found."
                });

            }

            const updatedAnnouncement = {

                id:
                    existing.id,

                number:
                    existing.number,

                title:
                    title.trim(),

                subtitle:
                    typeof subtitle === "string"
                        ? subtitle.trim()
                        : "",

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
                JSON.stringify(
                    updatedAnnouncement
                ),
                {
                    access: "private",
                    contentType:
                        "application/json",
                    addRandomSuffix: false
                }
            );

            return res.status(200).json({
                success: true,
                announcement:
                    updatedAnnouncement
            });

        }

        if (req.method === "DELETE") {

            const id =
                req.body?.id ||
                req.query?.id;

            if (
                !id ||
                typeof id !== "string"
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        "An announcement ID is required."
                });

            }

            const announcements =
                await getAllAnnouncements();

            const existing =
                announcements.find(
                    announcement =>
                        String(
                            announcement.id
                        ) === String(id)
                );

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement not found."
                });

            }

            await del(
                existing._pathname
            );

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
