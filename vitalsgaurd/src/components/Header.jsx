import React from 'react';
import { Link } from 'react-router-dom';
import { Button, buttonVariants, ShinyButton } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { Shield } from 'lucide-react';

export function Header({ links = [] }) {
	const [open, setOpen] = React.useState(false);
	const scrolled = useScroll(10);

	const defaultLinks = [
		{
			label: 'Features',
			href: '#',
		},
		{
			label: 'Pricing',
			href: '#',
		},
		{
			label: 'About',
			href: '#',
		},
	];

	const navLinks = links.length > 0 ? links : defaultLinks;

	React.useEffect(() => {
		if (open) {
			// Disable scroll
			document.body.style.overflow = 'hidden';
		} else {
			// Re-enable scroll
			document.body.style.overflow = '';
		}

		// Cleanup when component unmounts (important for Next.js)
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header
			className={cn(
				'sticky top-0 z-50 mx-auto w-full max-w-3xl bg-white shadow-sm md:rounded-xl md:mt-4 md:shadow-md md:transition-all md:ease-out',
				{
					'md:max-w-2xl': scrolled && !open,
					'bg-background/90': open,
				},
			)}
		>
			<nav
				className={cn(
					'flex h-12 w-full items-center justify-between px-4 md:h-11 md:transition-all md:ease-out',
					{
						'md:px-2': scrolled,
					},
				)}
			>
				<WordmarkIcon className="h-4" />
				<div className="hidden items-center gap-1.5 md:flex">
					{navLinks.map((link, i) => {
            const isAdminLink = ['Overview', 'Research', 'Policy'].includes(link.label);
            if (isAdminLink) {
              return (
                <Link key={i} to={link.href}>
                  <ShinyButton variant="blue" className="h-8 px-3.5 text-[11px]">
                    {link.label}
                  </ShinyButton>
                </Link>
              );
            }
            return (
              <Link key={i} className={buttonVariants({ variant: 'ghost' })} to={link.href}>
                {link.label}
              </Link>
            );
          })}
				</div>
				<Button size="icon" variant="outline" onClick={() => setOpen(!open)} className="md:hidden">
					<MenuToggleIcon open={open} className="size-5" duration={300} />
				</Button>
			</nav>

			<div
				className={cn(
					'bg-background/90 fixed top-14 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y md:hidden',
					open ? 'block' : 'hidden',
				)}
			>
				<div
					data-slot={open ? 'open' : 'closed'}
					className={cn(
						'data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out',
						'flex h-full w-full flex-col justify-between gap-y-2 p-4',
					)}
				>
					<div className="grid gap-y-2">
						{navLinks.map((link) => (
							<Link
								key={link.label}
								className={buttonVariants({
									variant: 'ghost',
									className: 'justify-start',
								})}
								to={link.href}
							>
								{link.label}
							</Link>
						))}
					</div>
					<div className="flex flex-col gap-2" />
				</div>
			</div>
		</header>
	);
}

export const WordmarkIcon = (props) => (
  <div className={cn("flex items-center gap-1.5 font-black text-xl tracking-tighter text-blue-600 dark:text-blue-400", props.className)}>
    <Shield className="w-5 h-5 fill-blue-600/10 text-blue-500" />
    <span>Vitals<span className="text-slate-400 dark:text-slate-500 font-black">Guard</span></span>
  </div>
);
