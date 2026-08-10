import { b as require_react, t as require_jsx_runtime, u as useRouter, w as __toESM } from "../index.js";
import { t as BrandLogo } from "./BrandLogo-D0AA1HMO.js";
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
var supportEmail = "MAMOBINI@gmail.com";
function Home() {
	const router = useRouter();
	const [comparison, setComparison] = (0, import_react.useState)(0);
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const [portal, setPortal] = (0, import_react.useState)(null);
	const [infoPanel, setInfoPanel] = (0, import_react.useState)(null);
	const [selectedService, setSelectedService] = (0, import_react.useState)("");
	const [submitted, setSubmitted] = (0, import_react.useState)(false);
	const [requestCode, setRequestCode] = (0, import_react.useState)("");
	const [requestError, setRequestError] = (0, import_react.useState)("");
	const [requestBusy, setRequestBusy] = (0, import_react.useState)(false);
	const [theme, setTheme] = (0, import_react.useState)("light");
	const [trackingCode, setTrackingCode] = (0, import_react.useState)("ATP-2026-00124");
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
		const form = event.currentTarget;
		setSubmitted(false);
		setRequestError("");
		setRequestBusy(true);
		try {
			const response = await fetch("/api/requests", {
				method: "POST",
				body: new FormData(form)
			});
			const result = await response.json();
			if (!response.ok || !result.code) throw new Error(result.error ?? "Your request could not be saved.");
			setRequestCode(result.code);
			setSubmitted(true);
			form.reset();
			setSelectedService("");
		} catch (error) {
			setRequestError(error instanceof Error ? error.message : "Your request could not be saved.");
		} finally {
			setRequestBusy(false);
		}
	}
	function handleTracking(event) {
		event.preventDefault();
		const normalised = trackingCode.trim().toUpperCase().replace(/\/+|\s+/g, "-");
		if (!normalised) return;
		router.push(`/track/${encodeURIComponent(normalised)}`);
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
			const result = await response.json();
			if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
			router.push(result.redirect ?? "/admin");
			router.refresh();
		} catch (error) {
			setTeamError(error instanceof Error ? error.message : "Sign-in failed.");
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
									accept: "image/*,.pdf,.doc,.docx,.dwg",
									multiple: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "upload-icon",
									children: "＋"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Add photos, plans or documents" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "Choose files or drag and drop · JPG, PNG, PDF, DOC or DWG" })
							]
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
						requestError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "form-error",
							role: "alert",
							children: requestError
						}),
						submitted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "preview-notice",
							role: "status",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Your request has been saved." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Your tracking reference is ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: requestCode }),
									". Keep this code to view future updates."
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => router.push(`/track/${encodeURIComponent(requestCode)}`),
									children: "Open project status →"
								})
							]
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
						href: `mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20-%20Report%20an%20Issue&body=Please%20describe%20the%20issue%2C%20the%20page%20you%20were%20using%20and%20what%20you%20expected%20to%20happen.%0A%0AIssue%3A%0APage%3A%0ADevice%3A`,
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
				className: "portal-modal",
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
					portal === "customer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker",
							children: "Customer portal"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: dialogTitleId,
							children: "Track your request"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Enter the unique reference code provided after your request is submitted." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "tracking-form",
							onSubmit: handleTracking,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Request or project code" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: trackingCode,
								onChange: (event) => setTrackingCode(event.target.value),
								placeholder: "ATP-2026-00124",
								autoCapitalize: "characters",
								required: true
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								className: "submit-button",
								children: ["View project status ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
							className: "modal-note",
							children: "A preview reference is ready so you can review the customer experience."
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "section-kicker",
							children: "Owner-controlled team access"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: dialogTitleId,
							children: "Team Sign In"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Owner access requires the registered email and password. Staff enter email, password and Team Code, then wait for the Owner to approve their role." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "owner-access-note",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Owner account" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email-only entry is disabled. Your password is verified securely on the server." })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "tracking-form",
							onSubmit: handleTeamSignIn,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Work email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "email",
									autoComplete: "username",
									value: teamEmail,
									onChange: (e) => setTeamEmail(e.target.value),
									placeholder: "name@company.com",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									autoComplete: "current-password",
									value: teamPassword,
									onChange: (e) => setTeamPassword(e.target.value),
									placeholder: "Enter your password",
									required: true
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Team code ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "(team members only)" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									value: teamCode,
									onChange: (e) => setTeamCode(e.target.value),
									placeholder: "Owner can leave this blank"
								})] }),
								teamError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "form-error",
									role: "alert",
									children: teamError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "submit",
									className: "submit-button",
									disabled: teamBusy,
									children: [
										teamBusy ? "Checking with Owner…" : "Check staff access",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "→" })
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", {
							className: "modal-note",
							children: "Five unsuccessful attempts temporarily lock further sign-in attempts."
						})
					] })
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
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "When the live request system is connected, Alert Tradie Pro will collect only the information needed to review, route and manage your project request, including your contact details, project details and files you choose to upload." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Your information will be used to contact you, assess the work, coordinate the appropriate Alert Construction or Alert Engineers team, and provide customer-visible project updates. We do not sell customer information." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "This current design preview does not transmit or store form entries. Do not upload confidential documents until the secure live workflow is activated." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"For a privacy question or correction request, email ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: `mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Privacy`,
										children: supportEmail
									}),
									"."
								] })
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
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Submitting a request is an enquiry only. It does not create a building contract, guarantee availability, confirm a price or authorise work to begin." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Project scopes, estimates, quotes, engineering advice, timeframes and approvals must be confirmed separately by the responsible Alert Construction or Alert Engineers team. Customers are responsible for providing accurate and lawful information and files." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Tracking information is provided to help customers follow progress. Dates and activities may change because of site conditions, approvals, materials, weather or trade availability." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
									"This preview is for design review and does not yet create a live request. Contact ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: `mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Terms`,
										children: supportEmail
									}),
									" with any questions."
								] })
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							className: "support-email-button",
							href: `mailto:${supportEmail}?subject=Alert%20Tradie%20Pro%20Support`,
							children: ["Email ", supportEmail]
						})
					] })
				]
			})
		})
	] });
}
//#endregion
export { Home as default };
