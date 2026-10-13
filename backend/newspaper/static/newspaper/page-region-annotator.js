(() => {
  const image = document.getElementById("page-image");
  const canvas = document.getElementById("page-canvas");
  const context = canvas.getContext("2d");
  const list = document.getElementById("section-list");
  const emptyMessage = document.getElementById("empty-sections");
  const status = document.getElementById("save-status");
  const saveButton = document.getElementById("save-sections");
  const mergeButton = document.getElementById("merge-sections");
  const unmergeButton = document.getElementById("unmerge-sections");
  const groupSelector = document.getElementById("existing-merge-groups");
  const assignGroupButton = document.getElementById("assign-merge-group");
  const existingGroups = JSON.parse(
    document.getElementById("initial-merge-groups").textContent,
  );
  const saveUrl = JSON.parse(
    document.getElementById("save-url").textContent,
  );
  const csrfToken = document.querySelector(
    "#csrf-form input[name=csrfmiddlewaretoken]",
  ).value;
  let sections = JSON.parse(
    document.getElementById("initial-sections").textContent,
  ).map((section) => ({ ...section }));
  let activeSection = null;
  const selectedSections = new Set();
  let drawing = null;

  function fitCanvas() {
    const bounds = image.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(bounds.width * ratio);
    canvas.height = Math.round(bounds.height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawSections();
  }

  function drawSections() {
    const bounds = image.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    sections.forEach((section, index) => {
      const left = (section.x / 100) * bounds.width;
      const top = (section.y / 100) * bounds.height;
      const width = (section.width / 100) * bounds.width;
      const height = (section.height / 100) * bounds.height;

      context.fillStyle = "rgba(34, 126, 91, 0.2)";
      context.strokeStyle = index === activeSection ? "#d71920" : "#176b4b";
      context.lineWidth = index === activeSection ? 3 : 2;
      context.fillRect(left, top, width, height);
      context.strokeRect(left, top, width, height);
      context.fillStyle = "#176b4b";
      context.font = "bold 14px sans-serif";
      context.fillText(String(index + 1), left + 5, top + 18);
    });

    if (drawing) {
      const left = Math.min(drawing.startX, drawing.currentX);
      const top = Math.min(drawing.startY, drawing.currentY);
      const width = Math.abs(drawing.currentX - drawing.startX);
      const height = Math.abs(drawing.currentY - drawing.startY);
      context.fillStyle = "rgba(215, 25, 32, 0.2)";
      context.strokeStyle = "#d71920";
      context.lineWidth = 2;
      context.fillRect(left, top, width, height);
      context.strokeRect(left, top, width, height);
    }
  }

  function renderList() {
    list.replaceChildren();
    emptyMessage.hidden = sections.length > 0;

    sections.forEach((section, index) => {
      const item = document.createElement("li");
      item.className = "region-annotator__section";
      if (activeSection === index) {
        item.classList.add("region-annotator__section--active");
      }

      const number = document.createElement("span");
      number.textContent = `${index + 1}.`;

      const title = document.createElement("input");
      title.type = "text";
      title.maxLength = 200;
      title.required = true;
      title.value = section.title;
      title.setAttribute("aria-label", `Article ${index + 1} title`);
      title.addEventListener("input", () => {
        section.title = title.value;
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => {
        sections.splice(index, 1);
        selectedSections.clear();
        activeSection = null;
        renderList();
        drawSections();
      });

      const coordinates = document.createElement("small");
      coordinates.className = "region-annotator__section-coords";
      coordinates.textContent = `x ${section.x.toFixed(2)}%, y ${section.y.toFixed(2)}%, width ${section.width.toFixed(2)}%, height ${section.height.toFixed(2)}%`;

      const select = document.createElement("input");
      select.type = "checkbox";
      select.checked = selectedSections.has(index);
      select.setAttribute("aria-label", `Select article ${index + 1} for merging`);
      select.addEventListener("change", () => {
        if (select.checked) {
          selectedSections.add(index);
        } else {
          selectedSections.delete(index);
        }
        updateMergeControls();
      });

      const groupLabel = document.createElement("small");
      groupLabel.className = "region-annotator__group-label";
      if (section.merge_group) {
        groupLabel.textContent = getGroupLabel(section.merge_group);
      }

      item.append(select, number, title, remove, coordinates, groupLabel);
      item.addEventListener("mouseenter", () => {
        activeSection = index;
        drawSections();
      });
      item.addEventListener("mouseleave", () => {
        activeSection = null;
        drawSections();
      });
      list.append(item);
    });

    updateMergeControls();
    drawSections();
  }

  function getGroupLabel(groupId) {
    return `Group ${getKnownGroups().indexOf(groupId) + 1}`;
  }

  function getGroupNumber(groupId) {
    const numberedGroup = groupId.match(/^group-(\d+)$/);
    return numberedGroup ? Number(numberedGroup[1]) : null;
  }

  function getGroupTimestamp(groupId) {
    const timestampGroup = groupId.match(/^[^-]+-(\d+)-/);
    return timestampGroup ? Number(timestampGroup[1]) : null;
  }

  function getKnownGroups() {
    return [...new Set([
      ...existingGroups,
      ...sections.map((section) => section.merge_group).filter(Boolean),
    ])].sort((left, right) => {
      const leftNumber = getGroupNumber(left);
      const rightNumber = getGroupNumber(right);
      if (leftNumber !== null || rightNumber !== null) {
        if (leftNumber === null) return -1;
        if (rightNumber === null) return 1;
        return leftNumber - rightNumber;
      }

      const leftTimestamp = getGroupTimestamp(left);
      const rightTimestamp = getGroupTimestamp(right);
      if (leftTimestamp !== null && rightTimestamp !== null) {
        return leftTimestamp - rightTimestamp || left.localeCompare(right);
      }
      if (leftTimestamp !== rightTimestamp) {
        return leftTimestamp !== null ? -1 : 1;
      }
      return left.localeCompare(right);
    });
  }

  function getNextGroupNumber() {
    return getKnownGroups().reduce((highest, groupId) => {
      const number = getGroupNumber(groupId);
      return number === null ? highest + 1 : Math.max(highest, number);
    }, 0) + 1;
  }

  function updateMergeControls() {
    const selected = [...selectedSections];
    const hasMergedSelection = selected.some(
      (index) => sections[index]?.merge_group,
    );
    const selectedGroup = groupSelector.value;
    const groups = getKnownGroups();
    groupSelector.replaceChildren(new Option("Choose a group", ""));
    groups.forEach((groupId) => {
      const option = new Option(getGroupLabel(groupId), groupId);
      groupSelector.add(option);
    });
    if (groups.includes(selectedGroup)) {
      groupSelector.value = selectedGroup;
    }
    mergeButton.disabled = selected.length === 0;
    unmergeButton.disabled = !hasMergedSelection;
    assignGroupButton.disabled = selected.length === 0 || !groupSelector.value;
  }

  mergeButton.addEventListener("click", () => {
    const selected = [...selectedSections];
    if (selected.length === 0) return;

    const groupId = `group-${getNextGroupNumber()}`;
    selected.forEach((index) => {
      sections[index].merge_group = groupId;
    });
    selectedSections.clear();
    groupSelector.value = "";
    activeSection = null;
    renderList();
    status.textContent = `Created a new group for ${selected.length} section(s). Save sections to apply it.`;
  });

  groupSelector.addEventListener("change", updateMergeControls);

  assignGroupButton.addEventListener("click", () => {
    const groupId = groupSelector.value;
    if (!groupId || selectedSections.size === 0) return;

    const selected = new Set(selectedSections);
    selectedSections.forEach((index) => {
      const currentGroup = sections[index]?.merge_group;
      if (!currentGroup) return;
      sections.forEach((section, memberIndex) => {
        if (section.merge_group === currentGroup) selected.add(memberIndex);
      });
    });
    selected.forEach((index) => {
      sections[index].merge_group = groupId;
    });
    selectedSections.clear();
    activeSection = null;
    renderList();
    status.textContent = `Added ${selected.size} section(s) to the selected group. Save sections to apply the change.`;
  });

  unmergeButton.addEventListener("click", () => {
    const selected = [...selectedSections];
    const selectedGroups = new Set(
      selected
        .map((index) => sections[index]?.merge_group)
        .filter(Boolean),
    );
    selected.forEach((index) => {
      if (sections[index]) sections[index].merge_group = "";
    });
    sections.forEach((section) => {
      if (selectedGroups.has(section.merge_group)) section.merge_group = "";
    });
    selectedSections.clear();
    activeSection = null;
    renderList();
    status.textContent = "Selected merged groups were separated. Save to apply the change.";
  });

  function pointerPosition(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(bounds.width, event.clientX - bounds.left)),
      y: Math.max(0, Math.min(bounds.height, event.clientY - bounds.top)),
      width: bounds.width,
      height: bounds.height,
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    const point = pointerPosition(event);
    drawing = {
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
      imageWidth: point.width,
      imageHeight: point.height,
    };
    drawSections();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = pointerPosition(event);
    drawing.currentX = point.x;
    drawing.currentY = point.y;
    drawSections();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!drawing) return;
    const point = pointerPosition(event);
    const left = Math.min(drawing.startX, point.x);
    const top = Math.min(drawing.startY, point.y);
    const width = Math.abs(point.x - drawing.startX);
    const height = Math.abs(point.y - drawing.startY);

    if (width >= 8 && height >= 8) {
      sections.push({
        title: `Article ${sections.length + 1}`,
        x: (left / drawing.imageWidth) * 100,
        y: (top / drawing.imageHeight) * 100,
        width: (width / drawing.imageWidth) * 100,
        height: (height / drawing.imageHeight) * 100,
      });
      activeSection = sections.length - 1;
      renderList();
      const titleInput = list.lastElementChild.querySelector("input");
      titleInput.focus();
      titleInput.select();
    }

    drawing = null;
    drawSections();
  });

  canvas.addEventListener("pointercancel", () => {
    drawing = null;
    drawSections();
  });

  saveButton.addEventListener("click", async () => {
    const invalidTitle = sections.findIndex(
      (section) => !section.title.trim(),
    );
    if (invalidTitle !== -1) {
      status.textContent = `Enter a title for article ${invalidTitle + 1}.`;
      list.children[invalidTitle].querySelector("input").focus();
      return;
    }

    saveButton.disabled = true;
    status.textContent = "Saving article sections...";

    try {
      const response = await fetch(saveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ sections }),
      });
      const result = await response.json();

      if (!response.ok) {
        status.textContent =
          typeof result.error === "string"
            ? result.error
            : JSON.stringify(result.error);
        return;
      }

      status.textContent = `Saved ${result.count} article section(s).`;
      window.location.reload();
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? `Could not save sections: ${error.message}`
          : "Could not save article sections.";
    } finally {
      saveButton.disabled = false;
    }
  });

  if (image.complete && image.naturalWidth) {
    fitCanvas();
    renderList();
  } else {
    image.addEventListener("load", () => {
      fitCanvas();
      renderList();
    });
  }

  new ResizeObserver(fitCanvas).observe(image);
})();
