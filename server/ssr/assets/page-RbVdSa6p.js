import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import { t as BrandLogo } from "./BrandLogo-3akqgd4n.js";
//#region app/page.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var services = [
	{
		title: "Kitchen Renovations",
		brand: "Alert Construction",
		description: "Modern kitchens designed around the way you live.",
		image: "/images/service-kitchen.webp"
	},
	{
		title: "Bathroom Renovations",
		brand: "Alert Construction",
		description: "Practical, refined bathrooms built to last.",
		image: "/images/service-bathroom.webp"
	},
	{
		title: "Home Renovations",
		brand: "Alert Construction",
		description: "Improve comfort, function and value throughout your home.",
		image: "/images/service-renovation.webp"
	},
	{
		title: "Home Extensions",
		brand: "Alert Construction",
		description: "More space, better flow and a stronger connection to home.",
		image: "/images/service-extension.webp"
	},
	{
		title: "New Homes",
		brand: "Alert Construction",
		description: "Quality new homes tailored to your site and lifestyle.",
		image: "/images/service-new-home.webp"
	},
	{
		title: "Building Inspections",
		brand: "Alert Construction",
		description: "Clear, practical reports backed by building experience.",
		image: "/images/service-inspection.webp"
	},
	{
		title: "Maintenance & Repairs",
		brand: "Alert Construction",
		description: "Reliable help to keep your property in good condition.",
		image: "/images/service-maintenance.webp"
	},
	{
		title: "Engineering Services",
		brand: "Alert Engineers",
		description: "Structural engineering, assessments, reports and advice.",
		image: "/images/service-engineering.webp"
	}
];
var brands = [
	{
		name: "Alert Construction",
		kind: "construction",
		description: "Renovations, extensions, new homes, inspections and construction."
	},
	{
		name: "Alert Engineers",
		kind: "engineers",
		description: "Structural engineering, assessments, reports and technical advice."
	},
	{
		name: "Alert Tradie Pro",
		kind: "tradie",
		description: "Request services, share files and track your project online."
	}
];
async function readApiResult(response) {
	const body = await response.text();
	if (!body) return {};
	try {
		return JSON.parse(body);
	} catch {
		throw new Error(response.ok ? "The server returned an unreadable response." : "The service is temporarily unavailable. Please try again.");
	}
}
function Home() {
	const router = useRouter();
	const [comparison, setComparison] = (0, import_react.useState)(0);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [portal, setPortal] = (0, import_react.useState)(null);
	const [infoPanel, setInfoPanel] = (0, import_react.useState)(null);
	const [selectedService, setSelectedService] = (0, import_react.useState)("");
	const [submitted, setSubmitted] = (0, import_react.useState)(null);
	const [requestError, setRequestError] = (0, import_react.useState)("");
	const [requestUploadWarning, setRequestUploadWarning] = (0, import_react.useState)("");
	const [requestBusy, setRequestBusy] = (0, import_react.useState)(false);
	const [theme, setTheme] = (0, import_react.useState)("light");
	const [trackingCode, setTrackingCode] = (0, import_react.useState)("");
	const [customerAccessMethod, setCustomerAccessMethod] = (0, import_react.useState)("code");
	const [customerContact, setCustomerContact] = (0, import_react.useState)("");
	const [customerError, setCustomerError] = (0, import_react.useState)("");
	const [customerSuccess, setCustomerSuccess] = (0, import_react.useState)("");
	const [customerMatches, setCustomerMatches] = (0, import_react.useState)([]);
	const [customerBusy, setCustomerBusy] = (0, import_react.useState)(false);
	const [teamEmail, setTeamEmail] = (0, import_react.useState)("");
	const [teamPassword, setTeamPassword] = (0, import_react.useState)("");
	const [teamCode, setTeamCode] = (0, import_react.useState)("");
	const [teamError, setTeamError] = (0, import_react.useState)("");
	const [teamBusy, setTeamBusy] = (0, import_react.useState)(false);
	const heroRef = (0, import_react.useRef)(null);
	const dialogTitleId = (0, import_react.useId)();
	(0, import_react.useEffect)(() => {
		const frame = window.requestAnimationFrame(() => {
			const savedTheme = window.localStorage.getItem("alert-tradie-pro-theme");
			const initialTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
			setTheme(initialTheme);
			document.documentElement.dataset.theme = initialTheme;
		});
		return () => window.cancelAnimationFrame(frame);
	}, []);
	(0, import_react.useEffect)(() => {
		const openTeamLogin = () => {
			if (window.location.hash === "#team-sign-in") setPortal("team");
		};
		openTeamLogin();
		window.addEventListener("hashchange", openTeamLogin);
		return () => window.removeEventListener("hashchange", openTeamLogin);
	}, []);
	(0, import_react.useEffect)(() => {
		let frame = 0;
		const updateComparison = () => {
			frame = 0;
			const hero = heroRef.current;
			if (!hero) return;
			const headerOffset = window.innerWidth <= 860 ? 68 : 74;
			const rect = hero.getBoundingClientRect();
			const travel = Math.max(1, hero.offsetHeight - (window.innerHeight - headerOffset));
			const progress = Math.min(1, Math.max(0, (headerOffset - rect.top) / travel));
			setComparison(Math.round(progress * 1e3) / 10);
		};
		const requestUpdate = () => {
			if (!frame) frame = window.requestAnimationFrame(updateComparison);
		};
		updateComparison();
		window.addEventListener("scroll", requestUpdate, { passive: true });
		window.addEventListener("resize", requestUpdate);
		return () => {
			if (frame) window.cancelAnimationFrame(frame);
			window.removeEventListener("scroll", requestUpdate);
			window.removeEventListener("resize", requestUpdate);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		const closeOnEscape = (event) => {
			if (event.key === "Escape") {
				setPortal(null);
				setInfoPanel(null);
				setMenuOpen(false);
			}
		};
		document.addEventListener("keydown", closeOnEscape);
		return () => document.removeEventListener("keydown", closeOnEscape);
	}, []);
	(0, import_react.useEffect)(() => {
		document.body.style.overflow = portal || infoPanel || menuOpen ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [
		portal,
		infoPanel,
		menuOpen
	]);
	function closeMenu() {
		setMenuOpen(false);
	}
	async function handleRequest(event) {
		event.preventDefault();
		const requestForm = event.currentTarget;
		setRequestBusy(true);
		setRequestError("");
		setRequestUploadWarning("");
		const form = new FormData(requestForm);
		const files = form.getAll("files").filter((value) => value instanceof File && value.size > 0);
		if (files.length > 5) {
			setRequestError("Choose no more than five files.");
			setRequestBusy(false);
			return;
		}
		if (files.some((file) => file.size > 5 * 1024 * 1024)) {
			setRequestError("Each photo or PDF must be 5 MB or smaller.");
			setRequestBusy(false);
			return;
		}
		const payload = Object.fromEntries([...form.entries()].filter(([, value]) => typeof value === "string"));
		try {
			const response = await fetch("/api/workflow/public", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			});
			const result = await readApiResult(response);
			if (!response.ok || !result.data) throw new Error(result.error ?? "Your request could not be submitted.");
			const uploads = [];
			for (const file of files) {
				const upload = new FormData();
				upload.set("caseId", String(result.data.caseId));
				upload.set("code", result.data.code);
				upload.set("file", file);
				uploads.push(fetch("/api/workflow/public/files", {
					method: "POST",
					body: upload
				}).then(async (uploadResponse) => ({
					ok: uploadResponse.ok,
					fileName: file.name
				})).catch(() => ({
					ok: false,
					fileName: file.name
				})));
			}
			const failedUploads = (await Promise.all(uploads)).filter((item) => !item.ok).map((item) => item.fileName);
			setTrackingCode(result.data.code);
			setSubmitted(result.data.code);
			if (failedUploads.length) setRequestUploadWarning(`Your request was saved, but ${failedUploads.length} file${failedUploads.length === 1 ? "" : "s"} could not be uploaded. Please quote your reference when contacting support.`);
			requestForm.reset();
			setSelectedService("");
		} catch (error) {
			const message = error instanceof Error ? error.message : "Your request could not be submitted.";
			setRequestError(message === "The string did not match the expected pattern." ? "The service could not read that request. Please check the details and try again." : message);
		} finally {
			setRequestBusy(false);
		}
	}
	async function handleTracking(event) {
		event.preventDefault();
		setCustomerError("");
		setCustomerSuccess("");
		const normalised = trackingCode.trim().toUpperCase().replace(/\/+|\s+/g, "-");
		if (!/^REQ-\d{4}-[A-F0-9]{32}$/.test(normalised)) {
			setCustomerError("Enter the complete private reference issued with your request.");
			return;
		}
		setCustomerBusy(true);
		try {
			const response = await fetch(`/api/workflow/public?code=${encodeURIComponent(normalised)}`, { cache: "no-store" });
			const result = await readApiResult(response);
			if (!response.ok || !result.data) throw new Error(result.error ?? "We could not find that project reference.");
			router.push(`/track/${encodeURIComponent(normalised)}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Project access is temporarily unavailable.";
			setCustomerError(message === "The string did not match the expected pattern." ? "The service could not read that reference. Please check it and try again." : message);
		} finally {
			setCustomerBusy(false);
		}
	}
	async function handleCustomerContactAccess(event) {
		event.preventDefault();
		if (customerAccessMethod === "code") return;
		setCustomerError("");
		setCustomerSuccess("");
		setCustomerMatches([]);
		setCustomerBusy(true);
		try {
			const response = await fetch("/api/workflow/public/access", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: customerAccessMethod,
					contact: customerContact
				})
			});
			const result = await readApiResult(response);
			if (!response.ok || !result.projects?.length) throw new Error(result.error ?? "No project matches those details.");
			if (result.projects.length === 1) {
				router.push(`/track/${encodeURIComponent(result.projects[0].requestCode)}`);
				return;
			}
			setCustomerMatches(result.projects);
			setCustomerSuccess(`${result.projects.length} projects found. Choose the project you want to open.`);
		} catch (error) {
			const message = error instanceof Error ? error.message : "Project recovery is temporarily unavailable.";
			setCustomerError(message === "The string did not match the expected pattern." ? "The service could not read those details. Please check them and try again." : message);
		} finally {
			setCustomerBusy(false);
		}
	}
	function chooseCustomerAccess(method) {
		setCustomerAccessMethod(method);
		setCustomerError("");
		setCustomerSuccess("");
		setCustomerMatches([]);
	}
	async function handleTeamSignIn(event) {
		event.preventDefault();
		setTeamBusy(true);
		setTeamError("");
		try {
			const response = await fetch("/api/team/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: teamEmail,
					password: teamPassword,
					teamCode
				})
			});
			const result = await readApiResult(response);
			if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
			window.location.href = result.redirect ?? "/team/pending";
			return;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Sign-in failed.";
			setTeamError(message === "The string did not match the expected pattern." ? "Sign-in is temporarily unavailable. Please try again." : message);
		} finally {
			setTeamBusy(false);
		}
	}
	function toggleTheme() {
		const nextTheme = theme === "light" ? "dark" : "light";
		setTheme(nextTheme);
		document.documentElement.dataset.theme = nextTheme;
		window.localStorage.setItem("alert-tradie-pro-theme", nextTheme);
	}
	function chooseService(service) {
		setSelectedService(service);
		document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "site-header",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "header-brand",
					href: "#home",
					"aria-label": "Alert Tradie Pro home",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
						kind: "tradie",
						tone: "dark",
						className: "header-logo"
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					className: "desktop-nav",
					"aria-label": "Primary navigation",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "active",
							href: "#home",
							children: "Home"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#about",
							children: "About Us"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#services",
							children: "Services"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPortal("customer"),
							children: "Customer Sign In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setPortal("team"),
							children: "Team Sign In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "#support",
							children: "Support"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							className: "theme-toggle",
							type: "button",
							onClick: toggleTheme,
							"aria-label": `Switch to ${theme === "light" ? "dark" : "light"} mode`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								children: theme === "light" ? "☾" : "☀"
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "header-cta",
							href: "#request",
							children: "Request a Job"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: `menu-button ${menuOpen ? "is-open" : ""}`,
					type: "button",
					"aria-label": menuOpen ? "Close menu" : "Open menu",
					"aria-expanded": menuOpen,
					onClick: () => setMenuOpen((open) => !open),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
					]
				})
			]
		}),
		menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mobile-menu",
			"aria-label": "Mobile navigation",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "#home",
					onClick: closeMenu,
					children: "Home"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "#about",
					onClick: closeMenu,
					children: "About Us"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "#services",
					onClick: closeMenu,
					children: "Services"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						closeMenu();
						setPortal("customer");
					},
					children: "Customer Sign In"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => {
						closeMenu();
						setPortal("team");
					},
					children: "Team Sign In"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: "#support",
					onClick: closeMenu,
					children: "Support"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					className: "mobile-cta",
					href: "#request",
					onClick: closeMenu,
					children: "Request a Job"
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "hero",
			id: "home",
			ref: heroRef,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "comparison-scene",
				"aria-label": "Construction project before and after comparison",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						className: "comparison-image construction-image",
						src: "/images/hero-construction.webp",
						alt: "Two-storey Australian home during construction"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "complete-layer",
						style: { clipPath: `inset(0 ${100 - comparison}% 0 0)` },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							className: "comparison-image",
							src: "/images/hero-complete.webp",
							alt: "The same two-storey Australian home after completion"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "hero-shade" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hero-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "eyebrow",
								children: "Construction · Renovation · Engineering"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", { children: [
								"Request, Track",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"and Manage",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								"Your Project Online"
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "hero-summary",
								children: "Request construction or engineering services, upload your documents and follow every customer-visible update through one secure portal."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hero-actions",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "button button-primary",
									href: "#request",
									children: "Request a Job"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "button button-secondary",
									type: "button",
									onClick: () => setPortal("customer"),
									children: "Customer Sign In"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "comparison-line",
						style: { left: `${comparison}%` },
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "comparison-handle",
							children: "‹›"
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hero-status hero-status-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Structure in progress"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hero-status hero-status-right",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {}), " Project complete"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `scroll-cue ${comparison > 96 ? "is-complete" : ""}`,
						"aria-hidden": "true",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: comparison > 96 ? "Continue to explore" : "Scroll to complete the project" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "↓" })]
					})
				]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "brands-section section",
			id: "about",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-heading compact-heading",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "section-kicker",
						children: "One connected customer experience"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Three connected brands. One clear process." }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Alert Construction and Alert Engineers deliver the work. Alert Tradie Pro keeps your request, documents and updates organised from first enquiry to final handover." })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "brand-grid",
				children: brands.map((brand, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: `brand-card ${index === 2 ? "brand-card-tradie" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "card-index",
							children: ["0", index + 1]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "brand-logo-wrap",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, { kind: brand.kind })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: brand.description }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: index === 2 ? "#request" : "#services",
							children: [
								index === 2 ? "Request and track" : "Explore services",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
							]
						})
					]
				}, brand.name))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "services-section section",
			id: "services",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "section-heading",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "section-kicker",
						children: "Our services"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "Services for every stage of your project" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Choose the service you need. We will review your request and organise the right next step." })
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "services-grid",
				children: services.map((service) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "service-card",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "service-image",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: service.image,
							alt: service.title,
							loading: "lazy"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "service-card-copy",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: service.brand }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: service.title }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: service.description }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								className: "service-request-link",
								type: "button",
								onClick: () => chooseService(service.title),
								children: ["Request this service ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
							})
						]
					})]
				}, service.title))
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "request-section",
			id: "request",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "request-inner",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "request-intro",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker light",
							children: "Start your request"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", { children: [
							"Tell us about",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							"your job."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Share the project details and our team will review your request, contact you and organise the next step." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
							className: "process-list",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Submit your request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Project details, timing and documents" })] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "We review the details" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Construction or engineering team assigned" })] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Track your progress" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Use your unique ATP reference code" })] })] })
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					className: "request-form",
					onSubmit: handleRequest,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-title-row",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Customer request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Request a Job" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Secure enquiry" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "form-grid",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Service required" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									name: "service",
									required: true,
									value: selectedService,
									onChange: (event) => setSelectedService(event.target.value),
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											disabled: true,
											children: "Select a service"
										}),
										services.map((service) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: service.title,
											children: service.title
										}, service.title)),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "Other",
											children: "Other"
										})
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Full name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "name",
									autoComplete: "name",
									placeholder: "Your full name",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Phone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "phone",
									type: "tel",
									autoComplete: "tel",
									placeholder: "04XX XXX XXX",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "email",
									type: "email",
									autoComplete: "email",
									placeholder: "name@email.com",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project location" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									name: "location",
									autoComplete: "street-address",
									placeholder: "Address or suburb",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preferred timeframe" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									name: "timeframe",
									required: true,
									defaultValue: "",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											disabled: true,
											children: "Select a timeframe"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "As soon as possible" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Within 1–3 months" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Within 3–6 months" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "6+ months / planning ahead" })
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Estimated budget" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									name: "budget",
									required: true,
									defaultValue: "",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											disabled: true,
											children: "Select a budget range"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Under $25,000" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "$25,000–$75,000" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "$75,000–$150,000" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "$150,000–$300,000" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "$300,000+" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Not sure yet" })
									]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Material preference" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									name: "material",
									required: true,
									defaultValue: "",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											disabled: true,
											children: "Select a finish level"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Economical" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Standard" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Premium" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Luxury" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { children: "Not sure yet" })
									]
								})] })
							]
						}),
						selectedService === "Other" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "full-field other-service-field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Describe the service you need" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									name: "otherService",
									rows: 4,
									minLength: 30,
									placeholder: "Please explain the type of project, what you need help with and the result you are looking for...",
									required: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Please provide enough detail for our team to route your request correctly." })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "full-field",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Project details" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								name: "details",
								rows: 4,
								placeholder: "Tell us what you would like to build, renovate, repair or assess...",
								required: true
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "upload-field",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "file",
									name: "files",
									accept: "image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf",
									multiple: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "upload-icon",
									children: "＋"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Add photos, plans or documents" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Up to 5 files · JPG, PNG, WebP or PDF · 5 MB each" })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "terms-consent",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								name: "termsAccepted",
								required: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"I have read and accept the ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setInfoPanel("privacy"),
									children: "Privacy Notice"
								}),
								" and ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setInfoPanel("terms"),
									children: "Request Terms"
								}),
								". I understand this request is not a building contract or fixed price."
							] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "submit-button",
							type: "submit",
							disabled: requestBusy,
							children: [
								requestBusy ? "Saving your request…" : "Submit Request",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
							]
						}),
						submitted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "preview-notice",
							role: "status",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["Request received · ", submitted] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Keep this reference to follow Admin review, Site Visit, estimate and approved project updates." })]
						}),
						requestUploadWarning && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "preview-notice warning-notice",
							role: "alert",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Request saved with an upload warning" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: requestUploadWarning })]
						}),
						requestError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "preview-notice",
							role: "alert",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Request not submitted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: requestError })]
						})
					]
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "benefits",
			"aria-label": "Portal benefits",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Secure uploads" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Customer documents protected" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "↻" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Clear progress tracking" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Customer-visible updates only" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "▤" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Quotes and documents" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Everything kept with the project" })
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "◌" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Direct communication" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "A clear connection to our team" })
				] })
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
			id: "support",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "footer-main",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "footer-brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "construction",
							tone: "dark",
							className: "footer-lockup"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://alertconstruction.com.au",
							children: "alertconstruction.com.au"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "footer-brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "engineers",
							tone: "dark",
							className: "footer-lockup"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "https://alertengineers.com.au",
							children: "alertengineers.com.au"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "footer-brand",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "tradie",
							tone: "dark",
							className: "footer-lockup"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Powered by Alert Construction" })]
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "footer-bottom",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "© 2026 Alert Tradie Pro" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setInfoPanel("privacy"),
						children: "Privacy"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setInfoPanel("terms"),
						children: "Terms & Conditions"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setInfoPanel("support"),
						children: "Support"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "#request",
						children: "Report an Issue"
					})
				] })]
			})]
		}),
		portal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "modal-backdrop",
			role: "presentation",
			onMouseDown: () => setPortal(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: `portal-modal ${portal === "team" ? "team-access-modal" : "customer-access-modal"}`,
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": dialogTitleId,
				onMouseDown: (event) => event.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "modal-close",
						type: "button",
						"aria-label": "Close sign in",
						onClick: () => setPortal(null),
						children: "×"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "modal-logo-pair",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "tradie",
							className: "modal-lockup"
						})
					}),
					portal === "customer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "customer-access-layout",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "customer-access-intro",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "access-badge",
									children: "PRIVATE PROJECT ACCESS"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "section-kicker",
									children: "Customer portal"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
									id: dialogTitleId,
									children: [
										"Your project.",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"One private reference."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Open the live record created for your request. You will only see information, documents and updates approved for customer viewing." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "customer-access-points",
									"aria-label": "Customer portal protections",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "✓" }), " No public project search"] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "✓" }), " Internal team notes stay private"] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "✓" }), " Approved updates only"] })
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "customer-login-form",
							onSubmit: customerAccessMethod === "code" ? handleTracking : handleCustomerContactAccess,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "CUSTOMER SIGN IN" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Open your project record" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Use your project code, or enter the exact email or phone saved when the request was created." })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "customer-access-methods",
									role: "tablist",
									"aria-label": "Customer sign-in method",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											role: "tab",
											"aria-selected": customerAccessMethod === "code",
											onClick: () => chooseCustomerAccess("code"),
											children: "Project code"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											role: "tab",
											"aria-selected": customerAccessMethod === "email",
											onClick: () => chooseCustomerAccess("email"),
											children: "Email"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											role: "tab",
											"aria-selected": customerAccessMethod === "phone",
											onClick: () => chooseCustomerAccess("phone"),
											children: "Phone"
										})
									]
								}),
								customerAccessMethod === "code" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Private request reference" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "customer-reference-input",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										"aria-hidden": "true",
										children: "ATP"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: trackingCode,
										onChange: (event) => {
											setTrackingCode(event.target.value.toUpperCase());
											setCustomerError("");
										},
										placeholder: "REQ-2026-…",
										autoCapitalize: "characters",
										autoComplete: "off",
										spellCheck: false,
										autoFocus: true,
										required: true
									})]
								})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: customerAccessMethod === "email" ? "Email saved with your request" : "Phone saved with your request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "customer-reference-input customer-contact-input",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", {
										"aria-hidden": "true",
										children: customerAccessMethod === "email" ? "@" : "+61"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: customerAccessMethod === "email" ? "email" : "tel",
										value: customerContact,
										onChange: (event) => {
											setCustomerContact(event.target.value);
											setCustomerError("");
											setCustomerSuccess("");
											setCustomerMatches([]);
										},
										placeholder: customerAccessMethod === "email" ? "name@email.com" : "04XX XXX XXX",
										autoComplete: customerAccessMethod === "email" ? "email" : "tel",
										autoFocus: true,
										required: true
									})]
								})] }),
								customerError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "form-error",
									role: "alert",
									children: customerError
								}),
								customerSuccess && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "customer-access-success",
									role: "status",
									children: ["✓ ", customerSuccess]
								}),
								customerMatches.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "customer-project-matches",
									"aria-label": "Matching projects",
									children: customerMatches.map((project) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => router.push(`/track/${encodeURIComponent(project.requestCode)}`),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: project.service || "Project request" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: project.suburb || "Location not specified" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "Open →" })]
									}, project.requestCode))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "submit",
									className: "customer-access-submit",
									disabled: customerBusy,
									children: [
										customerBusy ? "Checking your details…" : customerAccessMethod === "code" ? "Open project securely" : "Find my project",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "customer-access-footnote",
									children: customerAccessMethod === "code" ? "Never share this reference publicly." : "No verification message is sent. The details must exactly match the email or phone saved with your request."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									className: "customer-help-link",
									onClick: () => {
										setPortal(null);
										document.getElementById("request")?.scrollIntoView({ behavior: "smooth" });
									},
									children: "I need a new project request"
								})
							]
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "team-access-layout",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "team-access-intro",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "access-badge",
									children: "ONE SECURE ENTRY"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "section-kicker",
									children: "Owner & team workspace"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
									id: dialogTitleId,
									children: [
										"Sign in to your",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
										"company workspace."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "One form recognises the account. Owner uses email and password only. A new team member also enters the company Team Code." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "access-flow",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Enter details" }), "Email, password and—when joining—the Team Code."] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "02" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Owner approval" }), "New members wait while Owner assigns their position."] })] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "03" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Saved access" }), "Approved members return with the same email and password."] })] })
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "team-login-form",
							onSubmit: handleTeamSignIn,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WORKSPACE ACCESS" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Owner & Team Sign In" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "There is no separate Owner button." })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email / username" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "access-input",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "01" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "email",
										autoComplete: "username",
										value: teamEmail,
										onChange: (e) => setTeamEmail(e.target.value),
										placeholder: "name@email.com",
										autoFocus: true,
										required: true
									})]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "access-input",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "02" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "password",
										autoComplete: "current-password",
										value: teamPassword,
										onChange: (e) => setTeamPassword(e.target.value),
										placeholder: "Enter your password",
										required: true
									})]
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Team Code ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "New team requests only" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "access-input",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("i", { children: "03" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										autoComplete: "off",
										value: teamCode,
										onChange: (e) => setTeamCode(e.target.value.toUpperCase()),
										placeholder: "Owner leaves this blank"
									})]
								})] }),
								teamError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "form-error",
									role: "alert",
									children: teamError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "submit",
									className: "team-access-submit",
									disabled: teamBusy,
									children: [
										teamBusy ? "Checking your account…" : "Continue securely",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "team-access-footnote",
									children: "New team members go to Waiting Approval. Approved roles are saved and can be changed later by Owner."
								})
							]
						})]
					})
				]
			})
		}),
		infoPanel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "modal-backdrop",
			role: "presentation",
			onMouseDown: () => setInfoPanel(null),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "portal-modal info-modal",
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": dialogTitleId,
				onMouseDown: (event) => event.stopPropagation(),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						className: "modal-close",
						type: "button",
						"aria-label": "Close",
						onClick: () => setInfoPanel(null),
						children: "×"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "modal-logo-pair",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BrandLogo, {
							kind: "tradie",
							className: "modal-lockup"
						})
					}),
					infoPanel === "privacy" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker",
							children: "Privacy"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: dialogTitleId,
							children: "Your information matters."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "info-copy",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "What we collect." }), " We collect the contact details, project location, scope, timing, budget range and files you choose to provide so we can review, route and manage your enquiry. Please do not upload identity documents, payment-card details or unrelated sensitive information."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "How we use it." }), " We use the information to contact you, assess the proposed work, prepare estimates or contracts, coordinate the appropriate Alert Construction or Alert Engineers team, and provide approved project updates. We do not sell customer information."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Who can see it." }), " Access is limited by role. Owners and authorised Admin staff can access customer records needed for management; Site Supervisors and Workers receive only information needed for assigned work. Internal notes and private finance are not published to the customer portal."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Storage and security." }), " Production records must be stored in the protected database and object storage, not in public GitHub files or browser storage. We use server-side authentication, access controls, audit records and retention controls. No online service can promise zero risk, but we take reasonable technical and organisational steps to prevent misuse, loss and unauthorised access or disclosure."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Access, correction and retention." }), " Use the secure support form to request access or correction. We retain personal information only while needed for the enquiry, project, legal or dispute-resolution purposes, then delete or de-identify it where permitted."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Privacy incidents." }), " Suspected incidents are assessed and, where the Notifiable Data Breaches scheme applies, affected people and the OAIC are notified when legally required."] })
							]
						})
					] }),
					infoPanel === "terms" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker",
							children: "Terms & Conditions"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: dialogTitleId,
							children: "Using Alert Tradie Pro."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "info-copy",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "1. Enquiry only." }), " Submitting a request does not create a building contract, guarantee availability, confirm a fixed price or authorise work. A separate written estimate, scope and—where required—a compliant Victorian domestic building contract must be accepted before work begins."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "2. Accurate information." }), " You must provide accurate, lawful and reasonably complete project information and may upload only files you are entitled to share. Missing or inaccurate information can change the scope, price and timing."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "3. Estimates, selections and variations." }), " An estimate is based on the stated scope, assumptions and allowances. If you request additional work or select an item that costs more than the stated allowance, the additional amount may be charged only through the applicable contract and Victorian variation process. We will identify the change, price effect and time effect in writing and obtain approval where the law or contract requires it. Vague or undisclosed price increases are not authorised by this website term."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "4. Site conditions and allowances." }), " Latent conditions, permit requirements, engineering findings, unavailable materials and other matters outside the confirmed scope may require a written variation or revised proposal. Prime-cost and provisional-sum items must be reconciled as the signed contract and law require."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "5. Invoices." }), " Unless the signed contract states another lawful due date, an invoice is due 14 calendar days after issue. If it remains unpaid, we may issue a written notice, suspend work where the contract and law permit, recover agreed lawful costs or interest, and terminate only after the notice and termination requirements in the signed contract and applicable law have been satisfied. Non-payment does not create an automatic cancellation right."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "6. Timing and access." }), " Customer-visible dates are forecasts unless expressly confirmed in the signed contract. Weather, approvals, safety, access, latent conditions, materials and trade availability can affect timing. You must provide safe and reasonable site access when agreed."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "7. Quality, defects and handover." }), " Completion passes through Site Supervisor quality inspection, Admin review and Owner completion approval. Defects and incomplete items should be recorded through the project channel so they can be assessed and rectified under the contract and applicable statutory warranties."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "8. Consumer rights." }), " Nothing in these terms excludes rights or guarantees that cannot lawfully be excluded, including rights under Australian Consumer Law and Victorian building law. The signed project contract prevails over these request terms for project-specific work."] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "9. Legal review." }), " These request terms are an operational draft for Victoria and must be reviewed against the company’s registration, insurance, services and chosen contract by a Victorian construction lawyer before production launch."] })
							]
						})
					] }),
					infoPanel === "support" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker",
							children: "Support"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: dialogTitleId,
							children: "How the app works."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "support-steps",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "1" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Request a job" }), "Choose a service, add your project details and attach any useful photos or plans."] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Receive your ATP code" }), "After the live system accepts the request, you receive a unique code such as ATP/123456."] })] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Track the project" }), "Use Customer Sign In to view approved status updates, scheduled work and customer documents."] })] })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "support-email-button",
							href: "#request",
							onClick: () => setInfoPanel(null),
							children: "Open secure support form"
						})
					] })
				]
			})
		})
	] });
}
//#endregion
export { Home as default };
