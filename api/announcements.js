import { put, list, get, del } from "@vercel/blob";

export default async function handler(req, res) {
    try {

        if (req.method === "POST") {

            const {
                title,
                subtitle,
                sections
            } = req.body || {};

            if (
                !title ||
                typeof title !== "string" ||
                !title.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    error: "A main title is required."
                });
            }

            if (
                !Array.isArray(sections) ||
                sections.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    error: "At least one announcement is required."
                });
            }

            const existing = await list({
                prefix: "announcements/"
            });

            let nextNumber =
                existing.blobs.length + 1;

            const published = [];

            for (const section of sections) {

                if (
                    !section ||
                    typeof section.heading !== "string" ||
                    !section.heading.trim()
                ) {
                    continue;
                }

                if (
                    typeof section.content !== "string" ||
                    !section.content.trim()
                ) {
                    continue;
                }

                const id =
                    crypto.randomUUID();

                const announcement = {

                    id,

                    number:
                        String(nextNumber)
                            .padStart(3, "0"),

                    title:
                        section.heading.trim(),

                    subtitle:
                        typeof subtitle === "string"
                            ? subtitle.trim()
                            : "",

                    label:
                        typeof section.label === "string" &&
                        section.label.trim()
                            ? section.label.trim()
                            : "ANNOUNCEMENT",

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

                published.push(
                    announcement
                );

                nextNumber++;
            }

            if (published.length === 0) {

                return res.status(400).json({
                    success: false,
                    error:
                        "No valid announcements were provided."
                });

            }

            return res.status(201).json({
                success: true,
                announcements: published
            });
        }


        if (req.method === "GET") {

            const result =
                await list({
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
                    error: "Announcement title is required."
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

            const result =
                await list({
                    prefix: "announcements/"
                });

            let existingAnnouncement = null;
            let existingPathname = null;

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

                    if (
                        String(announcement.id) ===
                        String(id)
                    ) {

                        existingAnnouncement =
                            announcement;

                        existingPathname =
                            blob.pathname;

                        break;

                    }

                } catch (error) {

                    console.error(
                        "Could not inspect announcement:",
                        blob.pathname,
                        error
                    );

                }

            }

            if (
                !existingAnnouncement ||
                !existingPathname
            ) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement could not be found."
                });

            }

            const updatedAnnouncement = {

                ...existingAnnouncement,

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

                content

            };

            await put(
                existingPathname,
                JSON.stringify(
                    updatedAnnouncement
                ),
                {
                    access: "private",
                    contentType: "application/json",
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
                typeof req.body?.id === "string"
                    ? req.body.id
                    : typeof req.query?.id === "string"
                        ? req.query.id
                        : null;

            if (!id) {

                return res.status(400).json({
                    success: false,
                    error: "Announcement ID is required."
                });

            }

            const result =
                await list({
                    prefix: "announcements/"
                });

            let pathnameToDelete = null;

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

                    if (
                        String(announcement.id) ===
                        String(id)
                    ) {

                        pathnameToDelete =
                            blob.pathname;

                        break;

                    }

                } catch (error) {

                    console.error(
                        "Could not inspect announcement:",
                        blob.pathname,
                        error
                    );

                }

            }

            if (!pathnameToDelete) {

                return res.status(404).json({
                    success: false,
                    error:
                        "Announcement could not be found."
                });

            }

            await del(
                pathnameToDelete
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
