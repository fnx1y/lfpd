const dropdowns = document.querySelectorAll(".nav-dropdown");

const nestedButtons = document.querySelectorAll(
    ".nested-dropdown-button"
);

const overlay = document.querySelector(
    ".page-overlay"
);


function closeAllDropdowns() {

    dropdowns.forEach(dropdown => {

        dropdown.classList.remove("active");

    });


    document.querySelectorAll(
        ".nested-menu"
    ).forEach(menu => {

        menu.classList.remove("active");

    });


    document.body.classList.remove(
        "menu-open"
    );

}


dropdowns.forEach(dropdown => {

    const button = dropdown.querySelector(
        ".nav-button"
    );


    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const isActive =
                dropdown.classList.contains(
                    "active"
                );


            closeAllDropdowns();


            if (!isActive) {

                dropdown.classList.add(
                    "active"
                );


                document.body.classList.add(
                    "menu-open"
                );

            }

        }
    );

});


nestedButtons.forEach(button => {

    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const nestedMenuId =
                button.dataset.nested;


            const nestedMenu =
                document.getElementById(
                    nestedMenuId
                );


            const isActive =
                nestedMenu.classList.contains(
                    "active"
                );


            document.querySelectorAll(
                ".nested-menu"
            ).forEach(menu => {

                menu.classList.remove(
                    "active"
                );

            });


            if (!isActive) {

                nestedMenu.classList.add(
                    "active"
                );

            }

        }
    );

});


overlay.addEventListener(
    "click",
    () => {

        closeAllDropdowns();

    }
);


document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".nav-dropdown"
            )
        ) {

            closeAllDropdowns();

        }

    }
);


document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeAllDropdowns();

        }

    }
);
