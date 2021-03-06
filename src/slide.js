/*
 * lecture-slides.js (https://www.buzzlms.de)
 * © 2017  Dennis Schulmeister-Zimolong <dennis@pingu-mail.de>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 */
"use strict";

/**
 * This class represents a single slide.
 */
class Slide {
    /**
     * Constructor for direct construction of a new slide. On most cases however
     * it is better to create a new slide courtesy of the `createFromHTML`
     * method.
     *
     * @param {Object} values Optional values:
     *   * {Element} html: raw slide definition
     *   * {String} id: id of the slide
     *   * {String} title: title of the slide
     *   * {Element} content : DOM Node containing the slide content
     *   * {Element} details: DOM Node containing the explanation text
     *   * {Element} caption: DOM Node containing the caption text for the overview
     *   * {Boolean} enabled: Whether the slide is visible
     *   * {Boolean} chapter: Whether this is a chapter heading slide
     */
    constructor(values) {
        values = values || {};

        this.html = values.html || document.createElement("section");
        this.id = values.id || "";
        this.title = values.title || document.createElement("h1");
        this.titleText = values.titleText || "";
        this.content = values.content || document.createElement("div");
        this.details = values.details || document.createElement("div");
        this.caption = values.caption || document.createElement("div");
        this.enabled = values.enabled || false;
        this.chapter = values.chapter || false;
    }

    /**
     * Take a DOMCollection with a raw slide definition and create a
     * Slide object from it.
     *
     * @param {Element} html Raw slide definition
     * @return {Slide} New instance
     */
    static createFromHtml(html) {
        let values = {
            html: html,
            id: html.id,
            enabled: !html.classList.contains("invisible"),
        }
        html = $(html);
        let title = html.find("> h1");
        let content = html.find("> article");
        let details = html.find("> aside");
        let caption = html.find("> slide-caption");

        if (title.length) values.title = title[0];
        if (content.length) values.content = content[0];
        if (details.length) values.details = details[0];
        if (caption.length) values.caption = caption[0];

        if (values.title) {
            values.titleText = values.title.innerText;
        } else if (html.attr("data-title")) {
            values.titleText = html.attr("data-title");
        }

        if (html.attr("data-chapter") != undefined) {
            values.chapter = true;
        }

        return new Slide(values);
    }

    /**
     * This method renders the slide to a new HTML element which can be used
     * to display the slide. Due to the different types of slides (with or
     * without fixed aspect ratios, presentation more on/off, ...) this method
     * is a bit complicated. Callers however get a completely rendered slide
     * which they only need to throw on the screen.
     *
     * @param  {Boolean} presentationMode Hide detail explanations at the side
     * @return {Element} A new HTML element with the rendered slide
     */
    renderSlide(presentationMode) {
        // Define basic layout structure
        let rendered = $($.parseHTML(`
            <!-- Main container -->
            <div
                class="ls-slide-container"
                style="
                    flex-grow: 1;
                    flex-shrink: 1;

                    display: flex;
                    flex-direction: column;
                    align-content: stretch;

                    position: relative;"
            >
                <div
                    class="ls-slide-inner container-fluid p-3"
                    style="flex-grow: 1; flex-shrink: 1;"
                >
                    <div class="ls-slide-title row">
                        <!-- Slide title -->
                    </div>
                    <div class="ls-slide-main row">
                        <!-- Details and Slide -->
                    </div>
                </div>

                <!-- Slide background -->
            </div>
        `));

        rendered = $(rendered.filter("div")[0]);

        // Add background layer
        let background = this.createBackgroundElement();
        background.classList.add("ls-slide-background");
        background.style.position = "absolute";
        background.style.top = 0;
        background.style.left = 0;
        background.style.bottom = 0;
        background.style.right = 0;
        background.style.zIndex = -10;
        rendered.append(background);

        // Add title
        let titleContainer = rendered.find(".ls-slide-title");

        titleContainer.append(
            $($.parseHTML("<div class='col'></div>")).append(this.title.cloneNode(true))
        );

        // Add content
        let details = this.createDetailsElement();
        let content = this.createContentElement();

        let mainContainer = rendered.find(".ls-slide-main");

        if (presentationMode) {
            // Presentation mode, only slide unless there is no slide.
            // Then it's only the detail text.
            if (content.innerHTML != "") {
                content.classList.add("col-md");
                mainContainer.append(content);
            } else {
                details.classList.add("col-md");
                mainContainer.append(details);
            }
        } else if (details.innerHTML != "" && content.innerHTML != "") {
            // Slide with detailed explanation
            details.classList.add("col-md-4");
            content.classList.add("col-md-8");

            mainContainer.append(details);
            mainContainer.append(content);
        } else if (details.innerHTML != "") {
            // Only details, no slide
            details.classList.add("col-md");
            mainContainer.append(details);
        } else if (content.innerHTML != "") {
            // Only slide, no details
            content.classList.add("col-md");
            mainContainer.append(content);
        }

        // Return finished slide
        return rendered[0];
    }

    /**
     * Create a new, unstyled DOM element with the slide content. This can
     * be used to apply further CSS styles and display the slide.
     *
     * @return {Element} DOM element with the slide content
     */
    createContentElement() {
        let element = this.content.cloneNode(true);
        element.classList.add("ls-slide-content");
        return element;
    }

    /**
     * Create a new, unstyled DOM element with the detail content. This can
     * be used to apply further CSS styles and display the additional
     * explanations for a slide.
     *
     * @return {Element} DOM element with the detail content
     */
    createDetailsElement() {
        let element = this.details.cloneNode(true);
        element.classList.add("ls-slide-details");
        return element;
    }

    /**
     * Create a new DOM element with the background content of the slide.
     * This element can be used with a negative z-index in order to display
     * the slide backdrop.
     *
     * The background of a slide can be set via data attributes to the
     * <section> element. The following data attributes are recognized:
     *
     *   * data-background: Value for the CSS background statement
     *   * data-background-color: CSS color declaration
     *   * data-background-image: Image URL
     *
     * @return {Element} DOM element with the background layer
     */
    createBackgroundElement() {
        let element = document.createElement("div");
        element.classList.add("ls-slide-background");

        if (this.html.dataset.background) {
            element.style.background = this.html.dataset["background"];
        } else if (this.html.dataset.backgroundColor) {
            element.style.backgroundColor = this.html.dataset.backgroundColor;
        } else if (this.html.dataset.backgroundImage) {
            element.style.background = `url(${this.html.dataset.backgroundImage}) no-repeat center center`;
            element.style.backgroundSize = "cover";
        }

        return element;
    }
}

export default Slide;
